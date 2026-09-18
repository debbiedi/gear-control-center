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

The `sha256sums` line is a checksum **of the tarball this file lives in**, so
the copy inside any given release tarball cannot be self-consistent. The
authoritative copies are here on `main` and in the AUR repository; if you build
from a copy extracted out of a release archive, run `updpkgsums` first.

## Publishing to the AUR

Requires an [AUR account](https://aur.archlinux.org/register) with an SSH key
registered under **My Account → SSH Public Key**. Registration is closed to new
users at the time of writing, which is why this has not happened yet; nothing
else is missing.

`.SRCINFO` in this directory is kept current with `PKGBUILD`, so the push below
is the whole job once an account exists.

```bash
git clone ssh://aur@aur.archlinux.org/gear-control-center.git aur-repo
cp PKGBUILD .SRCINFO aur-repo/
cd aur-repo
git add PKGBUILD .SRCINFO
git commit -m "Initial release"
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
