# Arch packaging

`PKGBUILD` builds the application from a tagged release. It is kept here so it
is versioned alongside the code it builds; the AUR copy is a mirror of this
directory.

## Building it yourself

From a clone of this repository:

```bash
cd packaging/aur
makepkg -si
```

`makepkg` pulls the release tarball named in `pkgver`, not your working tree —
so to test a change, tag it first, or point `source=()` at a local path.

## Publishing to the AUR

Requires an [AUR account](https://aur.archlinux.org/register) with an SSH key
registered under **My Account → SSH Public Key**.

```bash
git clone ssh://aur@aur.archlinux.org/headset-control-center.git aur-repo
cp PKGBUILD .SRCINFO aur-repo/
cd aur-repo
git add PKGBUILD .SRCINFO
git commit -m "Initial release: 0.1.1"
git push
```

## After each release

```bash
# 1. Bump pkgver, reset pkgrel to 1
# 2. Refresh the checksum against the new tarball
updpkgsums
# 3. Regenerate the metadata the AUR reads
makepkg --printsrcinfo > .SRCINFO
# 4. Verify it still builds cleanly before anyone else does
makepkg -f
```
