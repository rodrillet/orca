# orca-fork: one isolated agent computer (docs/fork/agent-computer.md): its own desktop, browser and home.
FROM debian:trixie-slim

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
      tigervnc-standalone-server tigervnc-tools xauth dbus-x11 \
      xfce4-session xfwm4 xfce4-panel xfdesktop4 xfce4-settings thunar xfce4-terminal \
      adwaita-icon-theme fonts-noto-core fonts-noto-color-emoji \
      chromium python3-websockify xdotool scrot xclip ca-certificates procps \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 --shell /bin/bash agent

# The container is Chromium's sandbox (no user namespaces inside it); maximized on the desktop.
RUN printf 'export CHROMIUM_FLAGS="$CHROMIUM_FLAGS --no-sandbox --test-type --start-maximized"\n' \
      > /etc/chromium.d/orca-computer

COPY start-desktop.sh /usr/local/bin/start-desktop
RUN chmod 755 /usr/local/bin/start-desktop

USER agent
WORKDIR /home/agent
ENV HOME=/home/agent DISPLAY=:1
EXPOSE 6080
CMD ["/usr/local/bin/start-desktop"]
