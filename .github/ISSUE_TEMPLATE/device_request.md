---
name: Device support
about: A headset this application does not know about yet
labels: enhancement, device
---

**Device**
Model name, and the output of `lsusb | grep -i <vendor>`.

**Is its protocol documented anywhere?**
A link to an existing open-source implementation, a packet capture, or a
vendor document. This matters: commands are never guessed here, so a device
with no documented protocol cannot be supported no matter how much anyone
would like it to be.

**What does it do that this application would need to expose?**
Battery, sidetone, equaliser, lighting, and so on.
