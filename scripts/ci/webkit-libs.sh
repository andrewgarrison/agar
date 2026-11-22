#!/usr/bin/env bash
# WebKit needs system libraries (GStreamer, libmanette and friends) that the
# hosted Ubuntu image doesn't have. `playwright install-deps` apt-installs them
# on every run, which took 19-37 s. Instead, on a cache miss, this downloads
# those packages once and unpacks them into <dir> without installing anything;
# the job caches <dir>, and every run points the dynamic linker at it.
#
#   scripts/ci/webkit-libs.sh unpack <dir>   # cache miss: fill <dir>
#   scripts/ci/webkit-libs.sh env <dir>      # every run: export the paths
#
# A stale or broken cache can't pass silently: Playwright checks WebKit's
# libraries with ldd (honouring LD_LIBRARY_PATH) before it launches.
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
      # Skip upgrades of packages the image already has: a newer copy on
      # LD_LIBRARY_PATH would shadow the system's (libc, say) for every process.
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
    ;;
  env)
    libs="$dir/usr/lib/$arch_dir:$dir/lib/$arch_dir:$dir/usr/lib"
    echo "LD_LIBRARY_PATH=$libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" >> "$GITHUB_ENV"
    # GStreamer finds its plugins by directory, not through the linker.
    echo "GST_PLUGIN_SYSTEM_PATH_1_0=$dir/usr/lib/$arch_dir/gstreamer-1.0:/usr/lib/$arch_dir/gstreamer-1.0" >> "$GITHUB_ENV"
    ;;
  *)
    echo "usage: $0 unpack|env <dir>" >&2
    exit 2
    ;;
esac
