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
use types::{Capabilities, ConnectionState, DeviceInfo, DeviceState, DiscoveredDevice};

/// Whether commands may be sent to a device.
///
/// Two independent documents agreeing is enough to implement a headset. It is
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

/// Owns every device handle in the process.
///
/// Nothing above this layer touches hidapi, and nothing below it knows the UI
/// exists. Commands go: React -> Tauri command -> `DeviceManager` -> protocol
/// -> transport -> hardware.
pub struct DeviceManager {
    api: Option<hidapi::HidApi>,
    /// Why hidapi could not start, if it could not. Kept so the UI can explain
    /// itself instead of reporting "no devices" on what is really a host fault.
    api_error: Option<String>,
    active: Option<Box<dyn DeviceProtocol>>,
    /// The device's own audio card, opened alongside its control interface.
    /// Dropped together with the device so the two can never disagree about
    /// which headset is connected.
    audio: Option<AudioBackend>,
    connection: ConnectionState,
    use_mock: bool,
    /// What each headset was last sent, so it can be sent again. Every write
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
            active: None,
            audio: None,
            connection: ConnectionState::Disconnected,
            use_mock: false,
            memory: Memory::on_disk(),
        }
    }

    pub fn connection(&self) -> ConnectionState {
        self.connection.clone()
    }

    pub fn is_mock_mode(&self) -> bool {
        self.use_mock
    }

    /// Developer Mode toggle. Switching drops any live handle so the two modes
    /// can never be half-applied.
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

    /// Open a device. With no id, the first available one is chosen.
    pub fn connect(&mut self, device_id: Option<&str>) -> DeviceResult<DeviceInfo> {
        self.disconnect();
        self.connection = ConnectionState::Connecting;

        if self.use_mock {
            let mock = devices::mock::MockDevice::new();
            let info = mock.info().clone();
            self.audio = Some(AudioBackend::for_device(info.vendor_id, info.product_id, true));
            self.active = Some(Box::new(mock));
            self.connection = ConnectionState::Connected;
            return Ok(info);
        }

        let result = self.open_real(device_id);
        match &result {
            Ok(info) => {
                self.audio = Some(AudioBackend::for_device(
                    info.vendor_id,
                    info.product_id,
                    false,
                ));
                self.connection = ConnectionState::Connected;
            }
            Err(DeviceError::NotConnected) => self.connection = ConnectionState::Disconnected,
            Err(e) => {
                self.connection = ConnectionState::Error {
                    message: e.to_string(),
                }
            }
        }
        result
    }

    fn open_real(&mut self, device_id: Option<&str>) -> DeviceResult<DeviceInfo> {
        let api = self.api.as_mut().ok_or_else(|| {
            DeviceError::Transport(
                self.api_error
                    .clone()
                    .unwrap_or_else(|| "the HID subsystem is unavailable".into()),
            )
        })?;
        if let Err(e) = api.refresh_devices() {
            log::warn!("could not refresh the device list: {e}");
        }

        let id = match device_id {
            Some(id) => id.to_string(),
            None => discovery::discover(api)
                .into_iter()
                .find(|d| d.unavailable.is_none())
                .map(|d| d.info.id)
                .ok_or(DeviceError::NotConnected)?,
        };

        let candidate = discovery::candidate_for(api, &id).ok_or(DeviceError::NotConnected)?;
        let transport = HidTransport::open(api, &candidate.path)?;
        let info = candidate.info.clone();
        log::info!(
            "opened {} over {}",
            info.name,
            transport.describe()
        );
        self.active = Some((candidate.descriptor.build)(Box::new(transport), info.clone()));
        Ok(info)
    }

    pub fn disconnect(&mut self) {
        if let Some(device) = self.active.as_mut() {
            if let Err(e) = device.disconnect() {
                log::warn!("error while releasing the device: {e}");
            }
        }
        self.active = None;
        self.audio = None;
        self.connection = ConnectionState::Disconnected;
    }

    pub fn info(&self) -> Option<DeviceInfo> {
        self.active.as_ref().map(|d| d.info().clone())
    }

    pub fn capabilities(&self) -> Option<Capabilities> {
        self.active.as_ref().map(|d| d.capabilities().clone())
    }

    /// Read live state. A read failure demotes the connection rather than
    /// leaving the UI showing a stale value as if it were current.
    pub fn state(&mut self) -> DeviceResult<DeviceState> {
        let Some(device) = self.active.as_mut() else {
            return Ok(DeviceState::disconnected());
        };
        match device.read_state() {
            Ok(state) => Ok(state),
            Err(e) => {
                log::warn!("state read failed: {e}");
                self.connection = ConnectionState::Reconnecting;
                Err(e)
            }
        }
    }

    /// Read the device's audio card.
    ///
    /// Returns `None` rather than an error when no device is open: the
    /// interface asks for this on every refresh and an empty panel is the
    /// honest answer, not a failure.
    pub fn audio_state(&mut self) -> Option<DeviceResult<AudioState>> {
        self.audio.as_mut().map(|a| a.state())
    }

    /// Run an operation against the device's audio card.
    pub fn with_audio<T>(
        &mut self,
        op: impl FnOnce(&mut AudioBackend) -> DeviceResult<T>,
    ) -> DeviceResult<T> {
        let audio = self.audio.as_mut().ok_or(DeviceError::NotConnected)?;
        op(audio)
    }

    /// Run an operation against the open device.
    ///
    /// Every write to the hardware comes through here, which is where a device
    /// nobody has confirmed is held to reading only.
    pub fn with_device<T>(
        &mut self,
        op: impl FnOnce(&mut dyn DeviceProtocol) -> DeviceResult<T>,
    ) -> DeviceResult<T> {
        let result = self.write(op)?;
        self.remember();
        Ok(result)
    }

    fn write<T>(
        &mut self,
        op: impl FnOnce(&mut dyn DeviceProtocol) -> DeviceResult<T>,
    ) -> DeviceResult<T> {
        let device = self.active.as_mut().ok_or(DeviceError::NotConnected)?;
        writes_allowed(device.info().verified)?;
        op(device.as_mut())
    }

    /// Keep what the open device has been sent.
    ///
    /// Runs after every write that succeeded, so the record can never contain
    /// a value the device refused. The stand-in is left out: it would leave a
    /// fake entry in a real user's file.
    fn remember(&mut self) {
        let Some(device) = self.active.as_ref() else {
            return;
        };
        let info = device.info().clone();
        if info.is_mock {
            return;
        }
        let sent = device.sent();
        if let Err(e) = self.memory.record(&info, sent) {
            log::warn!("could not keep the settings of {}: {e}", info.name);
        }
    }

    /// Send the open device what it was last sent.
    ///
    /// The watcher calls this when the headset comes on — at start, after its
    /// own power cycle, after the dongle is plugged back in. On the power-on
    /// edge rather than on connect, because a write to a headset that is
    /// switched off reaches the dongle and nothing else. Nothing is assumed
    /// to have survived: it is sent, and only then reported as the state.
    pub fn restore(&mut self) {
        let Some(device) = self.active.as_ref() else {
            return;
        };
        let info = device.info().clone();
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
        let mut note = |label: &'static str, outcome: DeviceResult<()>| match outcome {
            Ok(()) => done.push(label),
            Err(e) => log::warn!("could not restore {label} on {}: {e}", info.name),
        };
        if let Some(level) = sent.sidetone {
            note("sidetone", self.write(|d| d.set_sidetone(level)));
        }
        if let Some(minutes) = sent.inactive_minutes {
            note("auto shut-off", self.write(|d| d.set_inactive_time(minutes)));
        }
        // A preset is recorded beside the curve it decodes to and cleared when
        // a custom curve follows it, so a preset still present is the more
        // recent choice of the two.
        if let Some(preset) = sent.equalizer_preset {
            note("equaliser preset", self.write(|d| d.set_equalizer_preset(preset)));
        } else if let Some(bands) = sent.equalizer_db.as_deref() {
            note("equaliser", self.write(|d| d.set_equalizer(bands)));
        }
        if !done.is_empty() {
            log::info!("restored {} on {}", done.join(", "), info.name);
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
        manager.active = Some(Box::new(Arctis7Plus::new(
            Box::new(fake.clone()),
            arctis_info(),
        )));
        manager.connection = ConnectionState::Connected;
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
        assert!(after.active.as_ref().unwrap().sent().is_empty());

        after.restore();

        let writes = second.writes();
        assert_eq!(writes.len(), 3, "one command per remembered setting");
        assert_eq!((writes[0][1], writes[0][2]), (CMD_SIDETONE, 2));
        assert_eq!((writes[1][1], writes[1][2]), (CMD_INACTIVE_TIME, 10));
        assert_eq!(writes[2][1], CMD_EQUALIZER);
        // And only now is it reported — as what was sent, not as an assumption.
        let sent = after.active.as_ref().unwrap().sent();
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
        assert_eq!(after.active.as_ref().unwrap().sent().equalizer_db.as_deref(), Some(&curve[..]));
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
