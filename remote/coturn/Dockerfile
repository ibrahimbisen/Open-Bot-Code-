FROM coturn/coturn:4.17.2-r0
COPY remote/coturn/turnserver.conf /etc/coturn/codebot.conf
COPY remote/coturn/entrypoint.sh /usr/local/bin/codebot-coturn
ENTRYPOINT ["/usr/local/bin/codebot-coturn"]
