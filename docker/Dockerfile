# syntax=docker/dockerfile:1
ARG BASE=ubuntu:24.04@sha256:a853f94d226358a79c740cfc7bce0c289748f3fe3488d921d038ccd752c61b60

FROM ${BASE} AS release
COPY CodeBot.AppImage /tmp/CodeBot.AppImage
WORKDIR /tmp
RUN chmod 0700 CodeBot.AppImage \
  && ./CodeBot.AppImage --appimage-extract >/dev/null \
  && chmod -R u+rwX,go=rX squashfs-root \
  && test -x squashfs-root/resources/hosting/codebot-container

FROM ${BASE}
ARG DEBIAN_FRONTEND=noninteractive
COPY --from=release /tmp/squashfs-root/resources/hosting/packages.txt /tmp/squashfs-root/resources/hosting/optional-packages.txt /tmp/
RUN apt-get update \
  && sed -e '/^#/d' -e '/^$/d' -e '/^apparmor$/d' /tmp/packages.txt /tmp/optional-packages.txt \
    | xargs apt-get install --yes --no-install-recommends \
      fonts-noto-cjk git less openssh-client procps ripgrep tini unzip xz-utils \
  && rm -rf /var/lib/apt/lists/* /tmp/packages.txt /tmp/optional-packages.txt
RUN userdel --remove ubuntu \
  && useradd --uid 1000 --user-group --home-dir /data --create-home --shell /bin/bash codebot \
  && install -d -o codebot -g codebot -m 0700 /run/codebot
RUN install -d -m 0755 /var/lib/codebot-update/requests /var/lib/codebot-update/status
COPY --from=release /tmp/squashfs-root /opt/CodeBot/app
RUN install -d -m 0755 /opt/CodeBot/hosted \
  && printf 'container\n' >/opt/CodeBot/hosted/mode \
  && ln -s /opt/CodeBot/app/resources/hosting/codebot /usr/local/bin/codebot

ARG VERSION=unknown
ARG REVISION=unknown
LABEL org.opencontainers.image.title=CodeBot \
  org.opencontainers.image.licenses=PolyForm-Noncommercial-1.0.0 \
  org.opencontainers.image.version=${VERSION} \
  org.opencontainers.image.revision=${REVISION}
ENV LANG=C.UTF-8 XDG_RUNTIME_DIR=/run/codebot
ENV PATH=${PATH}:/data/.local/bin
USER codebot
WORKDIR /data
VOLUME /data
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/bin/tini", "--", "/opt/CodeBot/app/resources/hosting/codebot-container"]
