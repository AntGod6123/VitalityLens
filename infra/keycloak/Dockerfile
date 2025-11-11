FROM quay.io/keycloak/keycloak:latest

USER root
RUN microdnf update -y \
    && microdnf install -y bash curl \
    && microdnf clean all
COPY keycloak-config.sh /opt/keycloak-config.sh
RUN chmod +x /opt/keycloak-config.sh
USER 1000

ENTRYPOINT ["/opt/keycloak-config.sh"]
