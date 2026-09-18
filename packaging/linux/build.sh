#!/usr/bin/env bash
#
# Build the distributable Linux packages inside a container.
#
# The host is Arch, and a package built on Arch runs on Arch. Everything else
# needs a build against an older glibc than the one the developer happens to
# have, which is what the two images beside this script are for:
#
#   ubuntu  -> .deb and .AppImage, floor glibc 2.35 (Ubuntu 22.04, Debian 12)
#   fedora  -> .rpm,               floor glibc 2.39 (Fedora 40, RHEL 10)
#
# Output lands in packaging/linux/out/. Run from anywhere.
#
#   ./packaging/linux/build.sh            # both
#   ./packaging/linux/build.sh ubuntu     # one
#
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
out="$root/packaging/linux/out"
targets=("${@:-ubuntu fedora}")
read -r -a targets <<<"${targets[*]}"

# Tracked files only, copied rather than mounted: the host's node_modules and
# target/ are built for Arch, and letting a container write into either leaves
# the developer with a tree that no longer builds locally. The container runs
# as root, so it hands the copy back before it exits — otherwise the trap below
# cannot delete what the build wrote.
stage="$(mktemp -d)"
# The build runs as root, so a failed run leaves root-owned files behind that
# this user cannot delete. Ownership is handed back from inside a container
# before the directory is removed, whether the build succeeded or not.
cleanup() {
  docker run --rm -v "$stage:/s" ubuntu:22.04 \
    chown -R "$(id -u):$(id -g)" /s >/dev/null 2>&1 || true
  rm -rf "$stage"
}
trap cleanup EXIT
git -C "$root" ls-files -z | tar -C "$root" --null -T - -cf - | tar -xf - -C "$stage"

mkdir -p "$out"

# Tauri names its bundles after the product, so they arrive with spaces in
# them; GitHub turns those into dots on a release asset and the download reads
# as a mistake. They are renamed on the way out, and collected from the build
# volume rather than hunted for. The volume is mounted inside the source tree
# rather than at /target so that the paths in tauri.conf.json — which pulls
# gearctl into the package — resolve the same way they do on the host.
collect='mkdir -p /src/bundle && find /src/src-tauri/target/release/bundle -type f \
  \( -name "*.deb" -o -name "*.rpm" -o -name "*.AppImage" \) -print0 \
  | while IFS= read -r -d "" f; do \
      b=$(basename "$f"); ext=${b##*.}; stem=${b%.*}; \
      cp "$f" "/src/bundle/$(printf %s "$stem" | tr " " "-" | tr "[:upper:]" "[:lower:]").$ext"; \
    done'

for distro in "${targets[@]}"; do
  case "$distro" in
    ubuntu) bundles="deb,appimage" ;;
    fedora) bundles="rpm" ;;
    *) echo "unknown target: $distro" >&2; exit 2 ;;
  esac

  echo "==> building the $distro image"
  docker build -q -t "gear-cc-build:$distro" \
    -f "$root/packaging/linux/Dockerfile.$distro" "$root/packaging/linux"

  echo "==> building $bundles"
  # A named volume per distribution keeps the Rust artefacts between runs; a
  # rebuild is minutes rather than the best part of an hour.
  docker run --rm \
    -v "$stage:/src" \
    -v "gear-cc-target-$distro:/src/src-tauri/target" \
    "gear-cc-build:$distro" \
    bash -euc "npm ci --no-audit --no-fund \
      && npm run tauri build -- --bundles $bundles \
      && $collect \
      && chown -R $(id -u):$(id -g) /src"

  cp -v "$stage"/bundle/* "$out/"
done

echo
echo "==> packages in $out"
for f in "$out"/*; do
  [ -f "$f" ] || continue
  printf '%s  %s\n' "$(du -h "$f" | cut -f1)" "$(basename "$f")"
done
