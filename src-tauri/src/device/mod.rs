pub mod devices;
pub mod discovery;
pub mod error;
pub mod memory;
pub mod protocol;
pub mod transport;
pub mod types;

use crate::audio::{AudioBackend, AudioState};
use error::{DeviceError, DeviceResult};
use memory::Memory;
use protocol::DeviceProtocol;
use transport::{HidTransport, Transport};
use types::{
    BatteryState, Capabilities, ConnectionState, DeviceInfo, DeviceState, DiscoveredDevice,
};

/// Whether commands may be sent to a device.
///
/// Two independent documents agreeing is enough to implement a device. It is
/// not enough to send it a command nobody has ever seen it answer, so an
/// unconfirmed device reads and does not write. Someone with one runs the
/// probe, says what happened, and the entry is promoted.
fn writes_allowed(verified: bool) -> DeviceResult<()> {
    if verified {
        Ok(())
    } else {
        Err(DeviceError::Unverified)
    }
}

/// Consecutive failed reads before a handle is released.
///
/// One failure is a hiccup. Three in a row means the device is gone, and
/// holding a dead handle would leave the application reporting "Reconnecting"
/// for ever — including after the device came back, because rediscovery only
/// opens what is not already open.
const FAILURES_BEFORE_RELEASE: u8 = 3;

/// One open device and everything that belongs to it.
struct Open {
    protocol: Box<dyn DeviceProtocol>,
    /// The device's own audio card, when it has one. Dropped together with the
    /// device so the two can never disagree about which headset is connected.
    audio: Option<AudioBackend>,
    connection: ConnectionState,
    /// Whether it was powered on at the last reading, so the moment it comes
    /// on can be noticed and its settings sent again.
    was_on: bool,
    failures: u8,
}

impl Open {
    fn id(&self) -> &str {
        &self.protocol.info().id
    }
}

/// What one device said in one pass.
pub struct DeviceReading {
    pub info: DeviceInfo,
    pub capabilities: Capabilities,
    pub connection: ConnectionState,
    pub state: Option<DeviceState>,
    pub state_error: Option<DeviceError>,
    pub audio: Option<AudioState>,
    pub audio_error: Option<DeviceError>,
}

/// Owns every device handle in the process.
///
/// Nothing above this layer touches hidapi, and nothing below it knows the UI
/// exists. Commands go: React -> Tauri command -> `DeviceManager` -> protocol
/// -> transport -> hardware.
///
/// More than one device is held open at a time — a headset and a mouse are
/// separate pieces of hardware and switching between them in the interface
/// must not mean closing one to look at the other. Commands act on the
/// selected one; readings are taken from all of them.
pub struct DeviceManager {
    api: Option<hidapi::HidApi>,
    /// Why hidapi could not start, if it could not. Kept so the UI can explain
    /// itself instead of reporting "no devices" on what is really a host fault.
    api_error: Option<String>,
    open: Vec<Open>,
    /// Device id the interface is pointed at.
    selected: Option<String>,
    use_mock: bool,
    /// What each device was last sent, so it can be sent again. Every write
    /// records into it; `restore` reads it back out.
    memory: Memory,
}

impl Default for DeviceManager {
    fn default() -> Self {
        Self::new()
    }
}

impl DeviceManager {
    pub fn new() -> Self {
        let (api, api_error) = match hidapi::HidApi::new() {
            Ok(api) => (Some(api), None),
            Err(e) => {
                log::error!("HID subsystem unavailable: {e}");
                (None, Some(e.to_string()))
            }
        };
        Self {
            api,
            api_error,
            open: Vec::new(),
            selected: None,
            use_mock: false,
            memory: Memory::on_disk(),
        }
    }

    fn current(&self) -> Option<&Open> {
        let id = self.selected.as_deref()?;
        self.open.iter().find(|d| d.id() == id)
    }

    fn current_mut(&mut self) -> Option<&mut Open> {
        let id = self.selected.clone()?;
        self.open.iter_mut().find(|d| d.id() == id)
    }

    /// The connection state of the selected device.
    pub fn connection(&self) -> ConnectionState {
        self.current()
            .map(|d| d.connection.clone())
            .unwrap_or(ConnectionState::Disconnected)
    }

    pub fn is_mock_mode(&self) -> bool {
        self.use_mock
    }

    /// Developer Mode toggle. Switching drops every live handle so the two
    /// modes can never be half-applied.
    pub fn set_mock_mode(&mut self, enabled: bool) {
        if self.use_mock != enabled {
            self.disconnect();
            self.use_mock = enabled;
        }
    }

    pub fn api_error(&self) -> Option<&str> {
        self.api_error.as_deref()
    }

    /// Rescan the bus. Cheap enough to call on hot-plug events and on demand.
    pub fn discover(&mut self) -> Vec<DiscoveredDevice> {
        if self.use_mock {
            let mock = devices::mock::MockDevice::new();
            return vec![DiscoveredDevice {
                info: mock.info().clone(),
                capabilities: mock.capabilities().clone(),
                unavailable: None,
            }];
        }
        let Some(api) = self.api.as_mut() else {
            return Vec::new();
        };
        if let Err(e) = api.refresh_devices() {
            log::warn!("could not refresh the device list: {e}");
        }
        discovery::discover(api)
    }

    fn is_open(&self, device_id: &str) -> bool {
        self.open.iter().any(|d| d.id() == device_id)
    }

    /// Point the interface at a device that is already open.
    pub fn select(&mut self, device_id: &str) -> DeviceResult<DeviceInfo> {
        let device = self
            .open
            .iter()
            .find(|d| d.id() == device_id)
            .ok_or(DeviceError::NotConnected)?;
        let info = device.protocol.info().clone();
        self.selected = Some(info.id.clone());
        Ok(info)
    }

    /// Open a device and select it. With no id, the first available one.
    pub fn connect(&mut self, device_id: Option<&str>) -> DeviceResult<DeviceInfo> {
        if let Some(id) = device_id {
            if self.is_open(id) {
                return self.select(id);
            }
        }

        if self.use_mock {
            let mock = devices::mock::MockDevice::new();
            let info = mock.info().clone();
            if !self.is_open(&info.id) {
                self.open.push(Open {
                    audio: Some(AudioBackend::for_device(info.vendor_id, info.product_id, true)),
                    protocol: Box::new(mock),
                    connection: ConnectionState::Connected,
                    was_on: false,
                    failures: 0,
                });
            }
            self.selected = Some(info.id.clone());
            return Ok(info);
        }

        let info = self.open_real(device_id)?;
        self.selected = Some(info.id.clone());
        Ok(info)
    }

    /// Open everything on the bus we know how to talk to and have not opened.
    ///
    /// Returns what was newly opened. A device that refuses to open is logged
    /// and skipped rather than failing the pass: one busy headset must not
    /// stop a mouse beside it from being picked up.
    pub fn open_all(&mut self) -> Vec<DeviceInfo> {
        let mut opened = Vec::new();
        let available: Vec<String> = self
            .discover()
            .into_iter()
            .filter(|d| d.unavailable.is_none())
            .map(|d| d.info.id)
            .filter(|id| !self.is_open(id))
            .collect();

        for id in available {
            match self.open_one(&id) {
                Ok(info) => {
                    log::info!("connected to {}", info.name);
                    opened.push(info);
                }
                Err(e) => log::debug!("could not open {id}: {e}"),
            }
        }

        // Something has to be in front when the window is drawn, and with
        // nothing chosen yet the first device opened is as good an answer as
        // any — the user changes it from the sidebar.
        if self.selected.is_none() {
            self.selected = self.open.first().map(|d| d.id().to_string());
        }
        opened
    }

    /// Open the mock device, which is the whole of the bus in simulation.
    fn open_mock(&mut self) -> DeviceResult<DeviceInfo> {
        let mock = devices::mock::MockDevice::new();
        let info = mock.info().clone();
        self.open.push(Open {
            audio: Some(AudioBackend::for_device(
                info.vendor_id,
                info.product_id,
                true,
            )),
            protocol: Box::new(mock),
            connection: ConnectionState::Connected,
            was_on: false,
            failures: 0,
        });
        Ok(info)
    }

    fn open_real(&mut self, device_id: Option<&str>) -> DeviceResult<DeviceInfo> {
        if self.use_mock {
            return self.open_mock();
        }
        let id = match device_id {
            Some(id) => id.to_string(),
            None => {
                let api = self.api_or_error()?;
                discovery::discover(api)
                    .into_iter()
                    .find(|d| d.unavailable.is_none())
                    .map(|d| d.info.id)
                    .ok_or(DeviceError::NotConnected)?
            }
        };
        self.open_one(&id)
    }

    fn api_or_error(&mut self) -> DeviceResult<&mut hidapi::HidApi> {
        let error = self.api_error.clone();
        let api = self.api.as_mut().ok_or_else(|| {
            DeviceError::Transport(
                error.unwrap_or_else(|| "the HID subsystem is unavailable".into()),
            )
        })?;
        if let Err(e) = api.refresh_devices() {
            log::warn!("could not refresh the device list: {e}");
        }
        Ok(api)
    }

    fn open_one(&mut self, device_id: &str) -> DeviceResult<DeviceInfo> {
        if self.use_mock {
            return self.open_mock();
        }
        let api = self.api_or_error()?;
        let candidate = discovery::candidate_for(api, device_id).ok_or(DeviceError::NotConnected)?;
        let transport = HidTransport::open(api, &candidate.path)?;
        let info = candidate.info.clone();
        log::info!("opened {} over {}", info.name, transport.describe());
        self.open.push(Open {
            audio: Some(AudioBackend::for_device(
                info.vendor_id,
                info.product_id,
                false,
            )),
            protocol: (candidate.descriptor.build)(Box::new(transport), info.clone()),
            connection: ConnectionState::Connected,
            was_on: false,
            failures: 0,
        });
        Ok(info)
    }

    /// Let go of every handle.
    pub fn disconnect(&mut self) {
        let ids: Vec<String> = self.open.iter().map(|d| d.id().to_string()).collect();
        for id in ids {
            self.release(&id);
        }
        self.selected = None;
    }

    /// Let go of one handle, leaving the others alone.
    pub fn release(&mut self, device_id: &str) {
        let Some(index) = self.open.iter().position(|d| d.id() == device_id) else {
            return;
        };
        let mut device = self.open.remove(index);
        if let Err(e) = device.protocol.disconnect() {
            log::warn!("error while releasing the device: {e}");
        }
        if self.selected.as_deref() == Some(device_id) {
            // Fall back to whatever is still open rather than leaving the
            // interface pointed at nothing while a device is right there.
            self.selected = self.open.first().map(|d| d.id().to_string());
        }
    }

    pub fn info(&self) -> Option<DeviceInfo> {
        self.current().map(|d| d.protocol.info().clone())
    }

    pub fn capabilities(&self) -> Option<Capabilities> {
        self.current().map(|d| d.protocol.capabilities().clone())
    }

    /// How many devices are held open.
    pub fn open_count(&self) -> usize {
        self.open.len()
    }

    pub fn selected_id(&self) -> Option<&str> {
        self.selected.as_deref()
    }

    /// Read live state from the selected device. A read failure demotes the
    /// connection rather than leaving the UI showing a stale value as if it
    /// were current.
    pub fn state(&mut self) -> DeviceResult<DeviceState> {
        let Some(device) = self.current_mut() else {
            return Ok(DeviceState::disconnected());
        };
        match device.protocol.read_state() {
            Ok(state) => Ok(state),
            Err(e) => {
                log::warn!("state read failed: {e}");
                device.connection = ConnectionState::Reconnecting;
                Err(e)
            }
        }
    }

    /// Read every open device in one pass, and keep them in order while doing
    /// it: settings are re-sent to a device that has just come on, repeated
    /// read failures release the handle.
    ///
    /// This is where a device's housekeeping belongs — the caller supplies the
    /// cadence and nothing else.
    pub fn read_all(&mut self) -> Vec<DeviceReading> {
        let mut readings = Vec::with_capacity(self.open.len());
        let mut lost: Vec<String> = Vec::new();
        let mut woken: Vec<String> = Vec::new();

        for device in self.open.iter_mut() {
            let info = device.protocol.info().clone();
            let capabilities = device.protocol.capabilities().clone();
            let (state, state_error) = match device.protocol.read_state() {
                Ok(s) => {
                    device.failures = 0;
                    if device.connection == ConnectionState::Reconnecting {
                        device.connection = ConnectionState::Connected;
                    }
                    (Some(s), None)
                }
                Err(e) => {
                    log::warn!("state read failed for {}: {e}", info.name);
                    device.connection = ConnectionState::Reconnecting;
                    device.failures = device.failures.saturating_add(1);
                    if device.failures >= FAILURES_BEFORE_RELEASE {
                        lost.push(info.id.clone());
                    }
                    (None, Some(e))
                }
            };

            // The device coming on — at start, after a power cycle, after the
            // dongle is plugged back in — is when it has to be told the
            // settings it does not report back.
            let on_now = state.as_ref().is_some_and(|s| s.powered_on);
            if on_now && !device.was_on {
                woken.push(info.id.clone());
            }
            device.was_on = on_now;

            let (audio, audio_error) = match device.audio.as_mut().map(|a| a.state()) {
                Some(Ok(a)) => (Some(a), None),
                Some(Err(e)) => (None, Some(e)),
                None => (None, None),
            };

            readings.push(DeviceReading {
                info,
                capabilities,
                connection: device.connection.clone(),
                state,
                state_error,
                audio,
                audio_error,
            });
        }

        for id in woken {
            self.restore_one(&id);
        }
        for id in lost {
            log::warn!("releasing {id} after {FAILURES_BEFORE_RELEASE} failed reads");
            self.release(&id);
        }
        readings
    }

    /// Read the selected device's audio card.
    ///
    /// Returns `None` rather than an error when no device is open: the
    /// interface asks for this on every refresh and an empty panel is the
    /// honest answer, not a failure.
    pub fn audio_state(&mut self) -> Option<DeviceResult<AudioState>> {
        self.current_mut()
            .and_then(|d| d.audio.as_mut())
            .map(|a| a.state())
    }

    /// Run an operation against the selected device's audio card.
    pub fn with_audio<T>(
        &mut self,
        op: impl FnOnce(&mut AudioBackend) -> DeviceResult<T>,
    ) -> DeviceResult<T> {
        let audio = self
            .current_mut()
            .and_then(|d| d.audio.as_mut())
            .ok_or(DeviceError::NotConnected)?;
        op(audio)
    }

    /// Run an operation against the selected device.
    ///
    /// Every write to the hardware comes through here, which is where a device
    /// nobody has confirmed is held to reading only.
    pub fn with_device<T>(
        &mut self,
        op: impl FnOnce(&mut dyn DeviceProtocol) -> DeviceResult<T>,
    ) -> DeviceResult<T> {
        let result = self.write_selected(op)?;
        self.remember();
        Ok(result)
    }

    fn write_selected<T>(
        &mut self,
        op: impl FnOnce(&mut dyn DeviceProtocol) -> DeviceResult<T>,
    ) -> DeviceResult<T> {
        let device = self.current_mut().ok_or(DeviceError::NotConnected)?;
        writes_allowed(device.protocol.info().verified)?;
        op(device.protocol.as_mut())
    }

    fn write_to<T>(
        &mut self,
        device_id: &str,
        op: impl FnOnce(&mut dyn DeviceProtocol) -> DeviceResult<T>,
    ) -> DeviceResult<T> {
        let device = self
            .open
            .iter_mut()
            .find(|d| d.id() == device_id)
            .ok_or(DeviceError::NotConnected)?;
        writes_allowed(device.protocol.info().verified)?;
        op(device.protocol.as_mut())
    }

    /// Keep what the selected device has been sent.
    ///
    /// Runs after every write that succeeded, so the record can never contain
    /// a value the device refused. The stand-in is left out: it would leave a
    /// fake entry in a real user's file.
    fn remember(&mut self) {
        let Some(device) = self.current() else {
            return;
        };
        let info = device.protocol.info().clone();
        if info.is_mock {
            return;
        }
        let sent = device.protocol.sent();
        if let Err(e) = self.memory.record(&info, sent) {
            log::warn!("could not keep the settings of {}: {e}", info.name);
        }
    }

    /// Send every open device what it was last sent.
    pub fn restore(&mut self) {
        let ids: Vec<String> = self.open.iter().map(|d| d.id().to_string()).collect();
        for id in ids {
            self.restore_one(&id);
        }
    }

    /// Send one device what it was last sent.
    ///
    /// Called when a device comes on rather than when it is opened, because a
    /// write to hardware that is switched off reaches the dongle and nothing
    /// else. Nothing is assumed to have survived: it is sent, and only then
    /// reported as the state.
    fn restore_one(&mut self, device_id: &str) {
        let Some(device) = self.open.iter().find(|d| d.id() == device_id) else {
            return;
        };
        let info = device.protocol.info().clone();
        if info.is_mock {
            return;
        }
        let Some(sent) = self.memory.recall(&info).cloned() else {
            return;
        };
        if sent.is_empty() {
            return;
        }

        let mut done: Vec<&str> = Vec::new();
        macro_rules! note {
            ($label:expr, $call:expr) => {
                match self.write_to(device_id, $call) {
                    Ok(()) => done.push($label),
                    Err(e) => log::warn!("could not restore {} on {}: {e}", $label, info.name),
                }
            };
        }

        if let Some(level) = sent.sidetone {
            note!("sidetone", |d| d.set_sidetone(level));
        }
        if let Some(minutes) = sent.inactive_minutes {
            note!("auto shut-off", |d| d.set_inactive_time(minutes));
        }
        // A preset is recorded beside the curve it decodes to and cleared when
        // a custom curve follows it, so a preset still present is the more
        // recent choice of the two.
        if let Some(preset) = sent.equalizer_preset {
            note!("equaliser preset", |d| d.set_equalizer_preset(preset));
        } else if let Some(bands) = sent.equalizer_db.as_deref() {
            note!("equaliser", |d| d.set_equalizer(bands));
        }
        if let (Some(dpis), Some(active)) = (sent.dpi_presets.as_deref(), sent.dpi_active) {
            note!("resolutions", |d| d.set_dpi_presets(dpis, active));
        }
        if let Some(hz) = sent.polling_rate {
            note!("report rate", |d| d.set_polling_rate(hz));
        }
        if let Some(lighting) = sent.lighting.as_ref() {
            for (zone, rgb) in lighting.colors.iter().enumerate() {
                let (zone, rgb) = (zone as u8, *rgb);
                note!("lighting", |d| d.set_lighting_color(zone, rgb));
            }
            // After the colours, so a rainbow put back on top of them wins, in
            // the same order the user set them.
            if let Some(effect) = lighting.effect {
                note!("lighting effect", |d| d.set_lighting_effect(effect));
            }
            if let Some(seconds) = lighting.dim_seconds {
                note!("dim timer", |d| d.set_dim_timer(seconds));
            }
            if let Some(color) = lighting.reactive_color {
                note!("reactive colour", |d| d.set_reactive_color(Some(color)));
            }
        }
        if !done.is_empty() {
            log::info!("restored {} on {}", done.join(", "), info.name);
        }
    }
}

#[cfg(test)]
impl DeviceManager {
    /// Take a fake-backed device as if it had been opened from the bus.
    ///
    /// The real path goes through hidapi, which needs hardware and permission.
    /// This is the seam the manager's own behaviour is tested through.
    fn adopt(&mut self, protocol: Box<dyn DeviceProtocol>) {
        let id = protocol.info().id.clone();
        self.open.push(Open {
            protocol,
            audio: None,
            connection: ConnectionState::Connected,
            was_on: false,
            failures: 0,
        });
        self.selected.get_or_insert(id);
    }

    fn sent_by(&self, device_id: &str) -> types::Sent {
        self.open
            .iter()
            .find(|d| d.id() == device_id)
            .map(|d| d.protocol.sent())
            .unwrap_or_default()
    }
}

/// A one-line summary of an open device, for the sidebar.
///
/// Deliberately small: it is published on every pass, and the full capability
/// record of the selected device is published beside it already.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceSummary {
    pub id: String,
    pub name: String,
    pub connection: ConnectionState,
    pub battery: Option<BatteryState>,
    pub powered_on: bool,
    /// False for a device implemented from documentation. The sidebar says so.
    pub verified: bool,
}

impl From<&DeviceReading> for DeviceSummary {
    fn from(reading: &DeviceReading) -> Self {
        Self {
            id: reading.info.id.clone(),
            name: reading.info.name.clone(),
            connection: reading.connection.clone(),
            battery: reading.state.as_ref().and_then(|s| s.battery),
            powered_on: reading.state.as_ref().is_some_and(|s| s.powered_on),
            verified: reading.info.verified,
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    /// Mock mode never reaches for the HID subsystem, so these run anywhere —
    /// including on a machine with no headset and no permission to look for
    /// one.
    fn simulated() -> DeviceManager {
        let mut manager = DeviceManager::new();
        manager.set_mock_mode(true);
        manager
    }

    #[test]
    fn a_device_can_be_opened_read_and_released() {
        let mut manager = simulated();

        let info = manager.connect(None).expect("the stand-in always opens");
        assert!(info.is_mock);
        assert_eq!(manager.connection(), ConnectionState::Connected);
        assert!(manager.capabilities().is_some());
        assert!(manager.state().is_ok());
        assert!(manager.audio_state().is_some());

        manager.disconnect();

        assert!(manager.info().is_none());
        assert!(manager.capabilities().is_none());
        assert_eq!(manager.connection(), ConnectionState::Disconnected);
        // The audio card belongs to the device; it goes with it.
        assert!(manager.audio_state().is_none());
    }

    #[test]
    fn state_without_a_device_is_a_reading_not_a_failure() {
        // The interface asks for this on every refresh. An empty panel is the
        // honest answer; an error would put a red banner over nothing wrong.
        let mut manager = DeviceManager::new();
        let state = manager.state().expect("no device is not an error");
        assert!(!state.powered_on);
        assert!(state.battery.is_none());
    }

    #[test]
    fn changing_mode_drops_whatever_was_open() {
        let mut manager = simulated();
        manager.connect(None).unwrap();
        assert!(manager.info().is_some());

        // Leaving simulation must not leave the stand-in connected underneath.
        manager.set_mock_mode(false);

        assert!(manager.info().is_none());
        assert!(!manager.is_mock_mode());
    }

    #[test]
    fn simulated_discovery_offers_the_stand_in_and_nothing_else() {
        let mut manager = simulated();
        let found = manager.discover();
        assert_eq!(found.len(), 1);
        assert!(found[0].info.is_mock);
        assert!(found[0].unavailable.is_none());
    }

    #[test]
    fn an_unconfirmed_device_reads_but_does_not_write() {
        assert!(writes_allowed(true).is_ok());
        assert!(matches!(writes_allowed(false), Err(DeviceError::Unverified)));
    }

    use devices::arctis_7_plus::{
        Arctis7Plus, CMD_EQUALIZER, CMD_INACTIVE_TIME, CMD_SIDETONE, PRODUCT_IDS, VENDOR_ID,
    };
    use transport::FakeTransport;

    fn arctis_info() -> DeviceInfo {
        DeviceInfo {
            id: "test-arctis".into(),
            name: "SteelSeries Arctis 7+".into(),
            vendor_id: VENDOR_ID,
            product_id: PRODUCT_IDS[0],
            serial: None,
            firmware_version: None,
            hardware_revision: None,
            connection: "USB".into(),
            is_mock: false,
            verified: true,
        }
    }

    /// A manager holding a fake-backed Arctis, remembering only in memory.
    fn holding(fake: &FakeTransport, memory: Memory) -> DeviceManager {
        let mut manager = DeviceManager::new();
        manager.memory = memory;
        manager.adopt(Box::new(Arctis7Plus::new(
            Box::new(fake.clone()),
            arctis_info(),
        )));
        manager
    }

    #[test]
    fn what_was_sent_is_sent_again_to_the_next_handle() {
        // The first handle: the user sets three things during a session.
        let first = FakeTransport::new();
        let mut before = holding(&first, Memory::in_memory());
        before.with_device(|d| d.set_sidetone(2)).unwrap();
        before.with_device(|d| d.set_inactive_time(10)).unwrap();
        before.with_device(|d| d.set_equalizer_preset(1)).unwrap();
        let kept = before.memory.clone();

        // The next handle — after a restart, a power cycle, a replug — knows
        // nothing until it is told.
        let second = FakeTransport::new();
        let mut after = holding(&second, kept);
        assert!(after.sent_by(&arctis_info().id).is_empty());

        after.restore();

        let writes = second.writes();
        assert_eq!(writes.len(), 3, "one command per remembered setting");
        assert_eq!((writes[0][1], writes[0][2]), (CMD_SIDETONE, 2));
        assert_eq!((writes[1][1], writes[1][2]), (CMD_INACTIVE_TIME, 10));
        assert_eq!(writes[2][1], CMD_EQUALIZER);
        // And only now is it reported — as what was sent, not as an assumption.
        let sent = after.sent_by(&arctis_info().id);
        assert_eq!(sent.sidetone, Some(2));
        assert_eq!(sent.equalizer_preset, Some(1));
    }

    #[test]
    fn a_custom_curve_that_followed_a_preset_is_what_comes_back() {
        let first = FakeTransport::new();
        let mut before = holding(&first, Memory::in_memory());
        before.with_device(|d| d.set_equalizer_preset(1)).unwrap();
        let curve = [2.5; devices::arctis_7_plus::EQ_BANDS];
        before.with_device(|d| d.set_equalizer(&curve)).unwrap();

        let second = FakeTransport::new();
        let mut after = holding(&second, before.memory.clone());
        after.restore();

        assert_eq!(second.writes().len(), 1, "the curve, not the preset it replaced");
        assert_eq!(after.sent_by(&arctis_info().id).equalizer_db.as_deref(), Some(&curve[..]));
    }

    #[test]
    fn a_device_with_nothing_kept_is_not_written_to() {
        let fake = FakeTransport::new();
        let mut manager = holding(&fake, Memory::in_memory());
        manager.restore();
        assert!(fake.wrote_nothing());
    }

    #[test]
    fn a_write_the_device_refused_is_not_remembered() {
        let fake = FakeTransport::new();
        fake.fail_writes("unplugged");
        let mut manager = holding(&fake, Memory::in_memory());
        assert!(manager.with_device(|d| d.set_sidetone(2)).is_err());
        assert!(manager.memory.recall(&arctis_info()).is_none());
    }

    #[test]
    fn the_stand_in_leaves_no_record() {
        let mut manager = simulated();
        manager.memory = Memory::in_memory();
        let info = manager.connect(None).unwrap();
        manager.with_device(|d| d.set_sidetone(1)).unwrap();
        assert!(manager.memory.recall(&info).is_none());
        manager.restore();
    }

    // -----------------------------------------------------------------------
    // Two devices at once
    //
    // A headset and a mouse are separate hardware and the interface switches
    // between them. Opening one must never mean closing the other, and a
    // command must never land on the device that merely happens to be first.
    // -----------------------------------------------------------------------

    use devices::aerox3_wireless::{self, Aerox3Wireless};

    fn mouse_info() -> DeviceInfo {
        DeviceInfo {
            id: "test-aerox".into(),
            name: "SteelSeries Aerox 3 Wireless".into(),
            vendor_id: aerox3_wireless::VENDOR_ID,
            product_id: aerox3_wireless::PRODUCT_IDS_WIRELESS[0],
            serial: None,
            firmware_version: None,
            hardware_revision: None,
            connection: "USB".into(),
            is_mock: false,
            verified: true,
        }
    }

    /// A manager holding a headset and a mouse, each on its own script.
    fn holding_both(memory: Memory) -> (DeviceManager, FakeTransport, FakeTransport) {
        let headset = FakeTransport::new();
        let mouse = FakeTransport::new();
        let mut manager = DeviceManager::new();
        manager.memory = memory;
        manager.adopt(Box::new(Arctis7Plus::new(
            Box::new(headset.clone()),
            arctis_info(),
        )));
        manager.adopt(Box::new(Aerox3Wireless::new(
            Box::new(mouse.clone()),
            mouse_info(),
        )));
        (manager, headset, mouse)
    }

    /// A headset status report: powered on, half charged, dial centred.
    fn headset_status() -> Vec<u8> {
        vec![0xb0, 0x00, 2, 0x00, 50, 50]
    }

    /// A mouse battery answer at the top of its scale.
    fn mouse_battery() -> Vec<u8> {
        vec![0x00, 0x15]
    }

    #[test]
    fn opening_a_second_device_does_not_close_the_first() {
        let (manager, _headset, _mouse) = holding_both(Memory::in_memory());
        assert_eq!(manager.open.len(), 2);
        // The first one opened is what the window opens on.
        assert_eq!(manager.selected_id(), Some(arctis_info().id.as_str()));
    }

    #[test]
    fn a_command_lands_on_the_selected_device_and_not_on_its_neighbour() {
        // This is the failure the whole rewrite exists to prevent: a sidetone
        // command reaching a mouse, or a resolution reaching a headset.
        let (mut manager, headset, mouse) = holding_both(Memory::in_memory());

        manager.with_device(|d| d.set_sidetone(2)).unwrap();
        assert_eq!(headset.writes().len(), 1);
        assert!(mouse.wrote_nothing(), "the mouse heard a headset command");

        manager.select(&mouse_info().id).unwrap();
        manager.with_device(|d| d.set_polling_rate(500)).unwrap();
        assert_eq!(headset.writes().len(), 1, "the headset heard a mouse command");
        assert_eq!(mouse.writes().len(), 1);
    }

    #[test]
    fn a_command_the_selected_device_cannot_do_is_refused_not_rerouted() {
        // The headset has no sensor. Asking it for one must fail rather than
        // quietly finding a device that does.
        let (mut manager, _headset, mouse) = holding_both(Memory::in_memory());
        assert!(matches!(
            manager.with_device(|d| d.set_polling_rate(1000)),
            Err(DeviceError::Unsupported(_))
        ));
        assert!(mouse.wrote_nothing());
    }

    #[test]
    fn each_device_keeps_its_own_record_of_what_it_was_sent() {
        let (mut manager, _headset, _mouse) = holding_both(Memory::in_memory());
        manager.with_device(|d| d.set_sidetone(3)).unwrap();
        manager.select(&mouse_info().id).unwrap();
        manager.with_device(|d| d.set_polling_rate(250)).unwrap();

        let headset = manager.sent_by(&arctis_info().id);
        let mouse = manager.sent_by(&mouse_info().id);
        assert_eq!(headset.sidetone, Some(3));
        assert!(headset.polling_rate.is_none());
        assert_eq!(mouse.polling_rate, Some(250));
        assert!(mouse.sidetone.is_none());
    }

    #[test]
    fn releasing_the_selected_device_moves_the_selection_to_what_is_left() {
        // Otherwise unplugging the headset leaves the window pointed at
        // nothing with a mouse sitting right there.
        let (mut manager, _headset, _mouse) = holding_both(Memory::in_memory());
        manager.release(&arctis_info().id);
        assert_eq!(manager.open.len(), 1);
        assert_eq!(manager.selected_id(), Some(mouse_info().id.as_str()));
        assert!(manager.info().is_some());
    }

    #[test]
    fn one_device_failing_to_answer_does_not_take_the_other_with_it() {
        let (mut manager, headset, mouse) = holding_both(Memory::in_memory());

        // The headset's dongle has gone; the mouse is answering normally.
        for _ in 0..FAILURES_BEFORE_RELEASE {
            headset.queue_failure("no such device");
            mouse.queue(&mouse_battery());
            let readings = manager.read_all();
            assert_eq!(readings.len().max(1), readings.len());
        }

        assert_eq!(manager.open.len(), 1, "only the dead handle is released");
        assert_eq!(manager.selected_id(), Some(mouse_info().id.as_str()));
    }

    #[test]
    fn a_device_that_answers_again_is_kept_rather_than_released() {
        // Two failures then an answer must reset the count: a hiccup every
        // other second would otherwise add up to a release.
        let (mut manager, headset, mouse) = holding_both(Memory::in_memory());
        for _ in 0..(FAILURES_BEFORE_RELEASE - 1) {
            headset.queue_failure("hiccup");
            mouse.queue(&mouse_battery());
            manager.read_all();
        }
        headset.queue(&headset_status());
        mouse.queue(&mouse_battery());
        manager.read_all();
        headset.queue_failure("hiccup");
        mouse.queue(&mouse_battery());
        manager.read_all();

        assert_eq!(manager.open.len(), 2, "a recovered device stays open");
    }

    #[test]
    fn a_reading_pass_reports_every_device_not_only_the_selected_one() {
        // The sidebar draws from this: a battery reading for the device that
        // is not in front still has to arrive.
        let (mut manager, headset, mouse) = holding_both(Memory::in_memory());
        headset.queue(&headset_status());
        mouse.queue(&mouse_battery());

        let readings = manager.read_all();
        assert_eq!(readings.len(), 2);
        let summaries: Vec<DeviceSummary> = readings.iter().map(DeviceSummary::from).collect();
        assert_eq!(summaries[0].battery.unwrap().percent, 50);
        assert_eq!(summaries[1].battery.unwrap().percent, 100);
        assert!(summaries.iter().all(|s| s.powered_on));
    }

    #[test]
    fn a_device_coming_on_is_sent_what_it_was_last_sent_without_being_asked() {
        // The mouse forgets its resolution when it powers down, and it is the
        // moment it comes back that the record has to be replayed. Nobody
        // calls restore here: reading is what notices.
        let kept = {
            let (mut manager, _h, _m) = holding_both(Memory::in_memory());
            manager.select(&mouse_info().id).unwrap();
            manager.with_device(|d| d.set_dpi_presets(&[800, 1600], 1)).unwrap();
            manager.with_device(|d| d.set_polling_rate(500)).unwrap();
            manager.memory.clone()
        };

        let (mut manager, headset, mouse) = holding_both(kept);
        assert!(manager.sent_by(&mouse_info().id).is_empty(), "a fresh handle knows nothing");

        // The opcodes a restore would use. Reading writes too — asking for the
        // battery is a write — so counting writes would not tell us anything.
        let dpi = aerox3_wireless::CMD_DPI | 0b0100_0000;
        let polling = aerox3_wireless::CMD_POLLING_RATE | 0b0100_0000;
        let opcodes = |t: &FakeTransport| -> Vec<u8> {
            t.writes().iter().map(|w| w[1]).collect()
        };

        // First pass: the mouse is asleep and says nothing, so nothing is
        // replayed — a write now would reach the receiver and stop there.
        headset.queue(&headset_status());
        manager.read_all();
        assert!(!opcodes(&mouse).contains(&dpi), "a sleeping mouse was written to");

        // Second pass: it answers, which is the edge that replays the record.
        headset.queue(&headset_status());
        mouse.queue(&mouse_battery());
        manager.read_all();

        let seen = opcodes(&mouse);
        assert!(seen.contains(&dpi), "the resolutions were not sent again");
        assert!(seen.contains(&polling), "the report rate was not sent again");

        let sent = manager.sent_by(&mouse_info().id);
        assert_eq!(sent.dpi_presets.as_deref(), Some(&[800u32, 1600][..]));
        assert_eq!(sent.polling_rate, Some(500));
    }

    #[test]
    fn a_command_without_a_device_is_refused_rather_than_ignored() {
        let mut manager = DeviceManager::new();
        assert!(matches!(
            manager.with_device(|d| d.set_sidetone(1)),
            Err(DeviceError::NotConnected)
        ));
        assert!(matches!(
            manager.with_audio(|a| a.set_playback_muted(true)),
            Err(DeviceError::NotConnected)
        ));
    }
}
