#!/bin/bash
set -euo pipefail
export LC_ALL=C DEBIAN_FRONTEND=noninteractive

update_url=${CODEBOT_UPDATE_URL:-}
unset CODEBOT_UPDATE_URL
service_user=""
auth_api_url=""
display_size=""
claim=${CODEBOT_CLAIM:-}
unset CODEBOT_CLAIM
server_name=""

fail() {
  echo "$*" >&2
  exit 1
}

fetch() {
  curl --fail --location --proto '=https' --proto-redir '=https' --tlsv1.2 --silent --show-error --retry 3 "$@"
}

usage() {
  cat <<'EOF'
Installs CodeBot as a self-hosted server on a Linux computer with no screen:

  sudo bash install-server.sh --update-url https://updates.example.com/codebot

Options (after `sudo bash -s --`):
  --user <name>             The user that runs CodeBot and its agents. Default: the user of the
                            installed server, else codebot, which the install makes when it does
                            not exist.
  --auth-api-url <origin>   Another account server, for development. Default: the one of the
                            installed server, else the one in the build.
  --display-size <W>x<H>    The size of the virtual display that computer use reads, from 640x480
                            to 2576x2576. Default: the one of the installed server, else 1280x800.
  --name <name>             The server name, with a claim. Default: CodeBot.
  --update-url <url>        The https:// URL of the update folder on your server (required, or set
                            CODEBOT_UPDATE_URL). The server updates itself from this folder.

The command from the app (Add server, Other options, New server on another computer) puts a line
CODEBOT_CLAIM=<claim> before this script on standard input. The install then signs in with that
one-time claim, asks no questions, waits until the server is online, and ends with exit code 0
only when the server is connected. The claim is not an argument, because sudo logs its arguments.

This file only downloads the latest release from your update folder and checks it against the
release manifest, the manifest that the Linux desktop updater reads. The install steps come from that release
(resources/hosting/codebot-server-setup), so they always match the build that they install.
See docs/self-hosted-server.md.
EOF
}

while [ "$#" -gt 0 ]; do
  case $1 in
    --user)
      [ "$#" -ge 2 ] || fail "Add a user name after --user."
      service_user=$2
      shift 2
      ;;
    --auth-api-url)
      [ "$#" -ge 2 ] || fail "Add a URL after --auth-api-url."
      auth_api_url=$2
      shift 2
      ;;
    --display-size)
      [ "$#" -ge 2 ] || fail "Add a size, such as 1920x1080, after --display-size."
      display_size=$2
      shift 2
      ;;
    --update-url)
      [ "$#" -ge 2 ] || fail "Add a URL after --update-url."
      update_url=$2
      shift 2
      ;;
    --name)
      [ "$#" -ge 2 ] || fail "Add a server name after --name."
      server_name=$2
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) fail "Unknown option: $1" ;;
  esac
done
[ -z "$server_name" ] || [ -n "$claim" ] || fail "Give --name only with the command from the app, or run: sudo codebot login --name <name>"

update_url=${update_url%/}
[[ $update_url =~ ^https://[^/[:space:]?#@]+(/[^[:space:]?#]*)?$ ]] || fail "Give the https:// URL of your update folder with --update-url."
[ "$(uname -s)" = Linux ] || fail "This install is for Linux. Run the desktop app on this computer instead."
[ "$(id -u)" -eq 0 ] || fail "Run this with sudo."
[ -d /run/systemd/system ] || fail "CodeBot needs systemd."
command -v apt-get >/dev/null || fail "CodeBot needs Ubuntu 24.04 or a newer Ubuntu or Debian."
# shellcheck disable=SC1091
. /etc/os-release
if [ "${ID:-}" != ubuntu ] || [ "${VERSION_ID:-}" != 24.04 ]; then
  echo "CodeBot is tested on Ubuntu 24.04. This is ${PRETTY_NAME:-an unknown system}; the install continues." >&2
fi
case $(uname -m) in
  x86_64) architecture=x86_64 manifest=latest-linux.yml ;;
  aarch64) architecture=arm64 manifest=latest-linux-arm64.yml ;;
  *) fail "CodeBot has no release for this machine." ;;
esac

refuse_signed_in() {
  local status
  status=$(codebot status 2>/dev/null) || return 0
  if grep -q '^Account: [^ ]*@' <<<"$status"; then
    fail "This server is signed in to an account. To add it to another account, run \"sudo codebot logout\" and then this command again."
  fi
}
if [ -n "$claim" ] && command -v codebot >/dev/null; then refuse_signed_in; fi

missing=()
for command in curl openssl; do command -v "$command" >/dev/null || missing+=("$command"); done
if [ "${#missing[@]}" -gt 0 ]; then
  apt-get -o DPkg::Lock::Timeout=600 update
  apt-get -o DPkg::Lock::Timeout=600 install -y --no-install-recommends ca-certificates "${missing[@]}"
fi

work=$(mktemp -d /var/tmp/codebot-install.XXXXXX)
trap 'rm -rf "$work"' EXIT
manifest=$(fetch "$update_url/$manifest")
version=$(sed -n 's/^version: *//p' <<<"$manifest" | head -n 1)
path=$(sed -n 's/^path: *//p' <<<"$manifest" | head -n 1)
sha512=$(sed -n 's/^sha512: *//p' <<<"$manifest" | head -n 1)
[[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "The release manifest has no valid version."
[ "$path" = "CodeBot-$version-$architecture.AppImage" ] || fail "The release manifest names another file."
[[ $sha512 =~ ^[A-Za-z0-9+/]{86}==$ ]] || fail "The release manifest has no valid SHA-512."

echo "Downloading CodeBot $version..."
fetch --output "$work/CodeBot.AppImage" "$update_url/$path"
[ "$(openssl dgst -sha512 -binary "$work/CodeBot.AppImage" | openssl base64 -A)" = "$sha512" ] ||
  fail "The download does not match the release manifest."
chmod 0700 "$work/CodeBot.AppImage"
(cd "$work" && ./CodeBot.AppImage --appimage-extract >/dev/null)

setup="$work/squashfs-root/resources/hosting/codebot-server-setup"
[ -f "$setup" ] || fail "CodeBot $version cannot install as a server. Try again after the next release."
if [ -n "$display_size" ] && ! grep -q CODEBOT_DISPLAY_SIZE "$setup"; then
  fail "CodeBot $version has no --display-size. Install without it, or try again after the next release."
fi
CODEBOT_UPDATE_URL=$update_url bash "$setup" "$service_user" "$work/squashfs-root" "$auth_api_url" ${display_size:+"$display_size"}

if [ -n "$claim" ]; then
  refuse_signed_in
  echo
  printf '%s\n' "$claim" | codebot login --claim ${server_name:+--name "$server_name"}
  status=$(codebot status)
  grep -q '^Server: \(.* (\)\{0,1\}online)\{0,1\}$' <<<"$status" ||
    fail "The server is not online. Run \"codebot status\" and \"codebot logs\" to see why."
  echo
  echo "CodeBot is connected to your account."
  exit 0
fi

cat <<'EOF'

Next, sign in with your CodeBot account:

  sudo codebot login

Other commands: codebot status, codebot logs, sudo codebot update. Run "codebot help" for all.
EOF
