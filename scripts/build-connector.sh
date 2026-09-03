#!/usr/bin/env sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root/wordpress-plugin"
rm -f "$repo_root/seokav-connector.zip"
zip -qr "$repo_root/seokav-connector.zip" seokav-wordpress-connector
printf 'Built %s\n' "$repo_root/seokav-connector.zip"
