//! Finding devices we know how to talk to.
//!
//! Adding hardware means adding one [`SupportedDevice`] entry — no page,
//! store or manager code changes with it.

use std::ffi::CString;

use super::devices::arctis_7_plus::{self, Arctis7Plus};
use super::devices::nova::{self, ArctisNova7};
use super::protocol::DeviceProtocol;
use super::transport::Transport;
use super::types::{Capabilities, DeviceInfo, DiscoveredDevice};

/// Whether this build has been run against the hardware.
///
/// A device added from a written specification is read-only until someone
/// with one confirms it. Two independent documents agreeing is enough to
/// implement a device; it is not enough to start writing to one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verification {
    /// Run against the physical device.
    Verified,
    /// Implemented from documentation, unconfirmed.
    Documented,
}

impl Verification {
    pub fn is_verified(self) -> bool {
        matches!(self, Self::Verified)
    }
}

pub struct SupportedDevice {
    pub vendor_id: u16,
    pub product_ids: &'static [u16],
    pub name: &'static str,
    /// USB interface carrying control traffic.
    pub interface: i32,
    /// HID usage page/usage of that same interface. Preferred over the
    /// interface number because Windows does not expose interface numbers.
    pub usage_page: u16,
    pub usage: u16,
    pub verification: Verification,
    pub capabilities: fn(product_id: u16) -> Capabilities,
    pub build: fn(Box<dyn Transport>, DeviceInfo) -> Box<dyn DeviceProtocol>,
}

pub static SUPPORTED: &[SupportedDevice] = &[SupportedDevice {
    vendor_id: arctis_7_plus::VENDOR_ID,
    product_ids: &arctis_7_plus::PRODUCT_IDS,
    name: "SteelSeries Arctis 7+",
    verification: Verification::Verified,
    interface: arctis_7_plus::CONTROL_INTERFACE,
    usage_page: arctis_7_plus::CONTROL_USAGE_PAGE,
    usage: arctis_7_plus::CONTROL_USAGE,
    capabilities: arctis_7_plus::capabilities,
    build: |transport, info| Box::new(Arctis7Plus::new(transport, info)),
}, SupportedDevice {
    vendor_id: nova::VENDOR_ID,
    product_ids: &nova::PRODUCT_IDS,
    name: "SteelSeries Arctis Nova 7",
    interface: nova::CONTROL_INTERFACE,
    usage_page: nova::CONTROL_USAGE_PAGE,
    usage: nova::CONTROL_USAGE,
    // Implemented from two documents that agree; nobody has run it against
    // the hardware, so it reads and does not write.
    verification: Verification::Documented,
    capabilities: nova::capabilities,
    build: |transport, info| Box::new(ArctisNova7::new(transport, info)),
}];

fn lookup(vendor_id: u16, product_id: u16) -> Option<&'static SupportedDevice> {
    SUPPORTED
        .iter()
        .find(|d| d.vendor_id == vendor_id && d.product_ids.contains(&product_id))
}

/// A device found on the bus with its control interface exposed.
pub struct Candidate {
    pub descriptor: &'static SupportedDevice,
    pub info: DeviceInfo,
    pub path: CString,
}

/// Does this HID node look like the device's control interface?
fn is_control_interface(
    node: &hidapi::DeviceInfo,
    descriptor: &SupportedDevice,
) -> bool {
    node.usage_page() == descriptor.usage_page && node.usage() == descriptor.usage
        || node.interface_number() == descriptor.interface
}

fn device_info(node: &hidapi::DeviceInfo, descriptor: &SupportedDevice) -> DeviceInfo {
    DeviceInfo {
        id: format!("{:04x}:{:04x}", node.vendor_id(), node.product_id()),
        name: descriptor.name.to_string(),
        vendor_id: node.vendor_id(),
        product_id: node.product_id(),
        // Most wireless dongles report no serial. "N/A" beats a made-up one.
        serial: node.serial_number().map(str::to_string).filter(|s| !s.is_empty()),
        // Neither reference implementation found a firmware-version command
        // for this family, so we do not claim to know it.
        firmware_version: None,
        hardware_revision: None,
        connection: "USB".to_string(),
        is_mock: false,
        verified: descriptor.verification.is_verified(),
    }
}

/// Enumerate every supported device, whether or not it can be opened.
///
/// A device whose control interface is missing from the HID enumeration is
/// still reported, with `unavailable` set — that is the normal signature of
/// another process holding the interface, and staying silent about it would
/// leave the user staring at "no device detected" with the headset plugged in.
pub fn discover(api: &hidapi::HidApi) -> Vec<DiscoveredDevice> {
    let mut found: Vec<DiscoveredDevice> = Vec::new();
    let mut seen_ids: Vec<String> = Vec::new();

    for node in api.device_list() {
        let Some(descriptor) = lookup(node.vendor_id(), node.product_id()) else {
            continue;
        };
        let info = device_info(node, descriptor);
        let control = is_control_interface(node, descriptor);

        if let Some(idx) = seen_ids.iter().position(|id| *id == info.id) {
            // Another interface of a device we already listed. If this is the
            // control one, it upgrades the entry from unavailable to usable.
            if control {
                found[idx].unavailable = None;
            }
            continue;
        }

        seen_ids.push(info.id.clone());
        found.push(DiscoveredDevice {
            info,
            capabilities: (descriptor.capabilities)(node.product_id()),
            unavailable: (!control).then(|| {
                format!(
                    "{} is connected, but its control interface is not available.",
                    descriptor.name
                )
            }),
        });
    }

    found
}

/// Locate the openable control interface for a device id, if there is one.
pub fn candidate_for(api: &hidapi::HidApi, device_id: &str) -> Option<Candidate> {
    api.device_list().find_map(|node| {
        let descriptor = lookup(node.vendor_id(), node.product_id())?;
        let info = device_info(node, descriptor);
        (info.id == device_id && is_control_interface(node, descriptor)).then(|| Candidate {
            descriptor,
            info,
            path: node.path().to_owned(),
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_arctis_7_plus_and_its_variants_are_recognised() {
        for pid in arctis_7_plus::PRODUCT_IDS {
            assert!(lookup(0x1038, pid).is_some(), "pid {pid:#06x}");
        }
    }

    #[test]
    fn unrelated_steelseries_hardware_is_not_claimed() {
        // The Aerox 3 mouse shares the vendor id and must not be picked up.
        assert!(lookup(0x1038, 0x183a).is_none());
        assert!(lookup(0x046d, 0xc336).is_none(), "Logitech keyboard");
    }

    #[test]
    fn every_registry_entry_declares_a_control_interface() {
        for d in SUPPORTED {
            assert!(!d.product_ids.is_empty(), "{}", d.name);
            assert!(d.usage_page != 0, "{}", d.name);
        }
    }
}
