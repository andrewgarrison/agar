#!/usr/bin/env bash
# WebKit needs system libraries (GStreamer, libmanette and friends) that the
# hosted Ubuntu image doesn't have. `playwright install-deps` apt-installs them
# on every run, which took 19-37 s. Instead, on a cache miss, this downloads
# those packages once and unpacks them into <dir> without installing anything;
# the job caches <dir>, and every run registers it with the linker.
#
#   scripts/ci/webkit-libs.sh unpack <dir>   # cache miss: fill <dir>
#   scripts/ci/webkit-libs.sh use <dir>      # every run: point the linker at it
#
# A stale or broken cache can't pass silently: Playwright checks WebKit's
# libraries (ldd, and ldconfig -p for dlopened ones) before it launches.
set -euo pipefail
mode=$1
dir=$2
arch_dir=$(dpkg-architecture -qDEB_HOST_MULTIARCH)

case "$mode" in
  unpack)
    sudo apt-get update -qq
    # --dry-run simulates the install (apt-get install -s), so the list includes
    # the packages those libraries depend on. It exits 1 when anything is missing.
    listed=$(bunx playwright install-deps --dry-run webkit | sed -n 's/^  \([^ ]*\)$/\1/p' || true)
    packages=()
    for package in $listed; do
      # Skip upgrades of packages the image already has: a newer copy in
      # the linker cache would shadow the system's (libc, say) for every process.
      if ! dpkg-query -W -f='${Status}' "$package" 2>/dev/null | grep -q 'install ok installed'; then
        packages+=("$package")
      fi
    done
    if [[ ${#packages[@]} -eq 0 ]]; then
      echo "::error::playwright install-deps --dry-run listed no missing packages; check its output format"
      bunx playwright install-deps --dry-run webkit || true
      exit 1
    fi
    echo "Unpacking ${#packages[@]} packages into $dir"
    debs=$(mktemp -d)
    (cd "$debs" && apt-get download -qq "${packages[@]}")
    mkdir -p "$dir"
    for deb in "$debs"/*.deb; do
      dpkg-deb -x "$deb" "$dir"
    done
    rm -rf "$debs"
    # Nothing reads these at runtime; they only make the cache slower to restore.
    rm -rf "$dir"/usr/share/{doc,doc-base,man,info,locale,lintian,bug}
    du -sh "$dir"
    du -sh "$dir"/usr/lib/"$arch_dir"/* "$dir"/usr/share/* 2>/dev/null | sort -rh | head -15
    ;;
  use)
    # Register the folders with the linker cache rather than LD_LIBRARY_PATH:
    # Playwright checks the libraries WebKit dlopens (libGLESv2, libx264) with
    # `ldconfig -p`, which only sees the cache.
    printf '%s\n' "$dir/usr/lib/$arch_dir" "$dir/usr/lib/$arch_dir/pulseaudio" "$dir/lib/$arch_dir" "$dir/usr/lib" |
      sudo tee /etc/ld.so.conf.d/zz-webkit-libs.conf > /dev/null
    sudo ldconfig
    # These find their files by directory, not through the linker cache.
    {
      # GStreamer's plugins.
      echo "GST_PLUGIN_SYSTEM_PATH_1_0=$dir/usr/lib/$arch_dir/gstreamer-1.0:/usr/lib/$arch_dir/gstreamer-1.0"
      # Mesa's EGL vendor file. Without it WebKit can't create an EGL display,
      # and every page hangs until the test times out.
      echo "__EGL_VENDOR_LIBRARY_DIRS=$dir/usr/share/glvnd/egl_vendor.d:/usr/share/glvnd/egl_vendor.d"
    } >> "$GITHUB_ENV"
    ;;
  *)
    echo "usage: $0 unpack|use <dir>" >&2
    exit 2
    ;;
esac
