#!/bin/sh
# Installs the Moonfold CLI from a GitHub Release archive. Needs only sh, tar,
# sha256sum or shasum, and curl or wget; no Node, npm, or compiler.
#
#   curl -fsSL https://raw.githubusercontent.com/Mr-Dark-debug/Moonfold/main/scripts/install.sh | sh
#
# Environment:
#   MOONFOLD_CHANNEL           release train to follow: stable, nightly, or preview
#                            (default: stable; preview is a maintainers' test train)
#   MOONFOLD_VERSION           exact version to install (overrides MOONFOLD_CHANNEL)
#   MOONFOLD_HOME              Moonfold home directory (default: ~/.moonfold)
#   MOONFOLD_INSTALL_BIN_DIR   where the `moonfold` symlink goes (default: ~/.local/bin)
#   MOONFOLD_RELEASE_BASE_URL  mirror for releases/download (default: GitHub)
#
# The archive is unpacked into $MOONFOLD_HOME/runtime/versions/<version>, the
# same layout `moonfold service install` uses, so the service reuses this download
# instead of fetching the release again.
set -eu

repo="Mr-Dark-debug/Moonfold"
base_url="${MOONFOLD_RELEASE_BASE_URL:-https://github.com/${repo}/releases/download}"
moonfold_home="${MOONFOLD_HOME:-$HOME/.moonfold}"
bin_dir="${MOONFOLD_INSTALL_BIN_DIR:-$HOME/.local/bin}"

fail() {
  printf '\nmoonfold install: %s\n' "$1" >&2
  exit 1
}

# ANSI stays on stderr, so `curl ... | sh` still gets progress.
interactive=false
if [ -t 2 ] && [ "${TERM:-}" != dumb ]; then interactive=true; fi
reset= bold= muted= accent= green=
if "$interactive" && [ -z "${NO_COLOR:-}" ]; then
  reset="$(printf '\033[0m')"; bold="$(printf '\033[1m')"
  muted="$(printf '\033[2m')"; accent="$(printf '\033[94m')"; green="$(printf '\033[32m')"
fi
step() {
  if "$interactive"; then printf '\r\033[2K  %s%s%s' "$muted" "$1" "$reset" >&2
  else printf '  %s\n' "$1" >&2; fi
}
# The Moonfold mark as pixel rows, drawn two rows per line with half blocks. '.' is empty and each
# letter is a colour (mid-tones that read on dark and light terminals): 24-bit where COLORTERM
# says so, otherwise the nearest of the 256-colour palette.
draw_mark() {
  case "${COLORTERM:-}" in
    truecolor | 24bit)
      mark_a='2;167;177;253' mark_b='2;148;161;250' mark_c='2;140;155;254'
      mark_d='2;130;144;244' mark_e='2;100;116;238' mark_f='2;85;101;235' ;;
    *) mark_a='5;147' mark_b='5;111' mark_c='5;105' mark_d='5;105' mark_e='5;69' mark_f='5;62' ;;
  esac
  esc="$(printf '\033')"
  line_number=0
  printf '\n' >&2
  while read -r top && read -r bottom; do
    line=''
    while [ -n "$top" ]; do
      t="${top%"${top#?}"}" b="${bottom%"${bottom#?}"}"
      top="${top#?}" bottom="${bottom#?}"
      if [ "$t$b" = .. ]; then line="$line "
      elif [ -n "${NO_COLOR:-}" ]; then
        if [ "$t" = . ]; then line="$line▄"; elif [ "$b" = . ]; then line="$line▀"; else line="$line█"; fi
      elif [ "$b" = . ]; then eval "fg=\$mark_$t"; line="$line$esc[38;${fg}m▀$esc[0m"
      elif [ "$t" = . ]; then eval "fg=\$mark_$b"; line="$line$esc[38;${fg}m▄$esc[0m"
      else eval "fg=\$mark_$t bg=\$mark_$b"; line="$line$esc[38;${fg};48;${bg}m▀$esc[0m"
      fi
    done
    case "$line_number" in
      4) line="$line    ${bold}Moonfold$reset" ;;
      5) line="$line    ${muted}CLI installer$reset" ;;
    esac
    printf '  %s\n' "$line" >&2
    line_number=$((line_number + 1))
  done <<'MARK'
..........................
....................a.....
..........abb.......aa....
........aab........aaaab..
.......abb.........aaabccc
......abbb..........aa...c
.....bbbb...........a..cc.
.....bbbb.............cc..
....bbbbc...........ccc...
....bbccd.........ccc.....
....cccdd.......ccc.......
..cccddddd....ccc....e....
.cc.ddddd..cccc.....ff....
cc..d...cccc........f.....
cc..ccccc.........fff.....
.cccc...eeeeeeeefffff.....
......eeeeeeeeffffff......
.......eeeeeeffffff.......
........eeefffffff........
..........ffffff..........
MARK
  printf '\n' >&2
}
if "$interactive"; then draw_mark; fi
step "Finding your release..."

# Exit 44 on a 404 so callers can tell "no such asset" from a network failure.
fetch() {
  if command -v curl >/dev/null 2>&1; then
    status="$(curl -sSL -w '%{http_code}' "$1" -o "$2")" || return 1
    case "$status" in
      2??) return 0 ;;
      404) return 44 ;;
      *) printf 'GET %s returned HTTP %s\n' "$1" "$status" >&2; return 1 ;;
    esac
  elif command -v wget >/dev/null 2>&1; then
    wget -q --server-response "$1" -O "$2" 2>"$2.headers" && rm -f "$2.headers" && return 0
    if grep -q ' 404 ' "$2.headers" 2>/dev/null; then rm -f "$2.headers"; return 44; fi
    cat "$2.headers" >&2; rm -f "$2.headers"; return 1
  else
    fail "curl or wget is required"
  fi
}

mb() {
  tenths=$((($1 * 10 + 524288) / 1048576))
  printf '%s.%s' "$((tenths / 10))" "$((tenths % 10))"
}
# Poll the file written by the downloader; no progress-output parsing or extra request.
download() {
  if ! "$interactive"; then fetch "$1" "$2"; return; fi
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -D "$2.headers" "$1" -o "$2" 2>"$2.errors" &
  else
    wget -q --server-response "$1" -O "$2" 2>"$2.headers" &
  fi
  download_pid=$!
  previous=-1
  cr="$(printf '\r')"
  while kill -0 "$download_pid" 2>/dev/null; do
    bytes=0; total=0
    if [ -f "$2" ]; then bytes="$(wc -c < "$2")"; fi
    if [ -f "$2.headers" ]; then
      while read -r key value; do
        case "$key" in
          HTTP/*) total=0 ;;
          [Cc]ontent-[Ll]ength:) total="${value%"$cr"}" ;;
        esac
      done < "$2.headers"
    fi
    case "$total" in ''|*[!0-9]*) total=0 ;; esac
    if [ "$bytes" -ne "$previous" ]; then
      if [ "$total" -gt 0 ]; then
        percent=$((bytes * 100 / total)); [ "$percent" -le 100 ] || percent=100
        filled=$((percent * 32 / 100)); bar=; rest=; n=0
        while [ "$n" -lt 32 ]; do
          if [ "$n" -lt "$filled" ]; then bar="${bar}■"; else rest="${rest}·"; fi
          n=$((n + 1))
        done
        printf '\r\033[2K  %s%s%s%s%s %3d%%  %s%s / %s MB%s' "$accent" "$bar" "$reset$muted" "$rest" "$reset" "$percent" "$muted" "$(mb "$bytes")" "$(mb "$total")" "$reset" >&2
      else
        printf '\r\033[2K  %sDownloading%s  %s MB' "$muted" "$reset" "$(mb "$bytes")" >&2
      fi
      previous="$bytes"
    fi
    sleep 0.1
  done
  result=0; wait "$download_pid" || result=$?
  download_pid=
  if [ "$result" -ne 0 ]; then
    printf '\n' >&2
    if [ -f "$2.errors" ]; then cat "$2.errors" >&2; else cat "$2.headers" >&2; fi
    return "$result"
  fi
  size="$(mb "$(wc -c < "$2")")"
  printf '\r\033[2K  %s■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■%s 100%%  %s%s / %s MB%s\n' "$accent" "$reset" "$muted" "$size" "$size" "$reset" >&2
  rm -f "$2.headers" "$2.errors"
}

case "$(uname -s)" in
  Darwin) platform="darwin" ;;
  Linux) platform="linux" ;;
  *) fail "unsupported operating system $(uname -s); use the desktop app or npm" ;;
esac
case "$(uname -m)" in
  arm64 | aarch64) arch="arm64" ;;
  x86_64 | amd64) arch="x64" ;;
  *) fail "unsupported architecture $(uname -m)" ;;
esac
command -v tar >/dev/null 2>&1 || fail "tar is required"
if command -v sha256sum >/dev/null 2>&1; then
  checksum() { sha256sum "$1" | cut -d' ' -f1; }
elif command -v shasum >/dev/null 2>&1; then
  checksum() { shasum -a 256 "$1" | cut -d' ' -f1; }
else
  fail "sha256sum or shasum is required"
fi

channel="${MOONFOLD_CHANNEL:-stable}"
version="${MOONFOLD_VERSION:-}"
if [ -z "$version" ]; then
  # Tags are v<semver>. Stable takes releases and testing builds (-beta.N, -rc.N),
  # matching `moonfold update`; nightly and preview tags carry a date and a run
  # number, so a stable install can never pick one up by accident.
  case "$channel" in
    stable) tag_pattern='v\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\(-[a-z][a-z]*\.[0-9][0-9]*\)\{0,1\}\)' ;;
    nightly | preview) tag_pattern="v\([0-9][^\"]*-${channel}\.[0-9]*\.[0-9]*\)" ;;
    *) fail "MOONFOLD_CHANNEL must be stable, nightly, or preview" ;;
  esac
  tmp_index="$(mktemp)"
  fetch "https://api.github.com/repos/${repo}/releases?per_page=100" "$tmp_index"
  version="$(sed -n "s/.*\"tag_name\": *\"${tag_pattern}\".*/\1/p" "$tmp_index" | head -n 1)"
  rm -f "$tmp_index"
  [ -n "$version" ] || fail "could not find a ${channel} release; set MOONFOLD_VERSION"
fi
case "$version" in
  *-preview.*)
    printf '%s\n' \
      "moonfold ${version} is a preview build." \
      "  Preview builds are cut by maintainers from unreleased branches to exercise the release" \
      "  pipeline. They can be broken, receive no fixes, and are never offered as updates." \
      "  Set MOONFOLD_CHANNEL=stable (the default) for a supported build." >&2
    if [ "$channel" != "preview" ] && [ -z "${MOONFOLD_VERSION:-}" ]; then
      fail "refusing a preview build that was not explicitly requested"
    fi
    ;;
esac

stem="moonfold-${version}-${platform}-${arch}"
archive="${stem}.tar.gz"
versions_dir="${moonfold_home}/runtime/versions"
target_dir="${versions_dir}/${version}"

if [ -f "${target_dir}/.install-complete" ] && [ "$(cat "${target_dir}/.install-complete")" = "$version" ]; then
  step "Version ${version} is already downloaded."
else
  mkdir -p "$versions_dir"
  staging="$(mktemp -d "${versions_dir}/.staging-XXXXXX")"
  download_pid=
  trap '[ -z "$download_pid" ] || { kill "$download_pid" 2>/dev/null || true; wait "$download_pid" 2>/dev/null || true; }; rm -rf "$staging"' EXIT
  trap 'printf "\n" >&2; exit 130' INT
  trap 'printf "\n" >&2; exit 143' TERM

  if "$interactive"; then printf '\r\033[2K' >&2; fi
  printf '  %sInstalling%s Moonfold %s%s%s\n\n' "$muted" "$reset" "$bold" "$version" "$reset" >&2
  step "Downloading..."
  fetch_status=0
  fetch "${base_url}/v${version}/SHA256SUMS" "${staging}/SHA256SUMS" || fetch_status=$?
  if [ "$fetch_status" -eq 44 ]; then
    fail "moonfold ${version} has no release archive for ${platform}-${arch}; releases before the self-contained CLI can only be installed with \`npm install -g moonfold@${version}\`"
  elif [ "$fetch_status" -ne 0 ]; then
    fail "could not download the release checksums"
  fi
  download "${base_url}/v${version}/${archive}" "${staging}/${archive}"

  step "Verifying the download..."
  expected="$(grep " \*\{0,1\}${archive}\$" "${staging}/SHA256SUMS" | cut -d' ' -f1)"
  [ -n "$expected" ] || fail "${archive} is not listed in SHA256SUMS"
  actual="$(checksum "${staging}/${archive}")"
  [ "$actual" = "$expected" ] || fail "checksum mismatch for ${archive}"

  step "Extracting Moonfold..."
  tar -xzf "${staging}/${archive}" -C "$staging" --strip-components=1
  rm -f "${staging}/${archive}" "${staging}/SHA256SUMS"
  "${staging}/moonfold" --version >/dev/null || fail "the downloaded executable does not run"
  printf '%s\n' "$version" > "${staging}/.install-complete"

  rm -rf "$target_dir"
  mv "$staging" "$target_dir"
  trap - EXIT
fi

step "Setting up the moonfold command..."
mkdir -p "$bin_dir"
ln -sfn "${target_dir}/moonfold" "${bin_dir}/moonfold"
if "$interactive"; then printf '\r\033[2K' >&2; fi
printf '  %sInstalled Moonfold %s%s\n\n' "$green" "$version" "$reset" >&2
case ":${PATH}:" in
  *":${bin_dir}:"*) printf '  Run %smoonfold%s to get started.\n\n' "$bold" "$reset" ;;
  *) printf '  Add %s to your PATH, then run %smoonfold%s.\n\n' "$bin_dir" "$bold" "$reset" ;;
esac
