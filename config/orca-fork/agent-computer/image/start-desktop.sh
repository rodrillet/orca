#!/usr/bin/env bash
# orca-fork: the computer's desktop: Xtigervnc on a 0600 Unix socket, XFCE, and websockify for viewers.
set -euo pipefail

RUN_DIR="$HOME/.orca-computer"
SOCKET="$RUN_DIR/vnc.sock"
GEOMETRY="${COMPUTER_GEOMETRY:-1440x900}"
mkdir -p "$RUN_DIR"
chmod 700 "$RUN_DIR"
rm -f "$SOCKET" /tmp/.X1-lock /tmp/.X11-unix/X1

# VncAuth only reads the first 8 characters; the hub hands the password to the owner's viewer.
printf '%s' "${VNC_PASSWORD:?VNC_PASSWORD is required}" | vncpasswd -f >"$RUN_DIR/passwd"
chmod 600 "$RUN_DIR/passwd"

Xtigervnc :1 -geometry "$GEOMETRY" -depth 24 -rfbport -1 -rfbunixpath "$SOCKET" -rfbunixmode 0600 \
  -SecurityTypes VncAuth -PasswordFile "$RUN_DIR/passwd" -AlwaysShared -AcceptSetDesktopSize=0 \
  -FrameRate=30 -UseBlacklist=0 -nolisten tcp &
for _ in $(seq 1 50); do
  [[ -S /tmp/.X11-unix/X1 && -S "$SOCKET" ]] && break
  sleep 0.1
done

(
  while true; do
    dbus-launch --exit-with-session xfce4-session >"$RUN_DIR/xfce.log" 2>&1 || true
    sleep 2
  done
) &

exec websockify 0.0.0.0:6080 --unix-target="$SOCKET"
