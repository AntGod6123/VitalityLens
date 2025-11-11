#!/bin/bash
set -euo pipefail

REALM="app"
CLIENT_WEB="web-client"
CLIENT_API="core-api"

/opt/keycloak/bin/kc.sh start-dev --import-realm &
KEYCLOAK_PID=$!

cleanup() {
  kill "$KEYCLOAK_PID"
}
trap cleanup EXIT

# Wait for Keycloak to be ready
until curl -sf http://localhost:8080/realms/master/.well-known/openid-configuration >/dev/null; do
  echo "Waiting for Keycloak to start..."
  sleep 5
done

echo "Creating realm ${REALM}" >/proc/1/fd/1

/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"

# Create realm if it does not exist
if ! /opt/keycloak/bin/kcadm.sh get realms/${REALM} >/dev/null 2>&1; then
  /opt/keycloak/bin/kcadm.sh create realms -s realm=${REALM} -s enabled=true
fi

# Create web client (public)
if ! /opt/keycloak/bin/kcadm.sh get clients -r ${REALM} --query clientId=${CLIENT_WEB} | grep -q ${CLIENT_WEB}; then
  /opt/keycloak/bin/kcadm.sh create clients -r ${REALM} -s clientId=${CLIENT_WEB} -s enabled=true -s publicClient=true -s 'redirectUris=["*"]' -s 'webOrigins=["*"]'
fi

# Create core-api client (confidential, service account)
if ! /opt/keycloak/bin/kcadm.sh get clients -r ${REALM} --query clientId=${CLIENT_API} | grep -q ${CLIENT_API}; then
  /opt/keycloak/bin/kcadm.sh create clients -r ${REALM} -s clientId=${CLIENT_API} -s enabled=true -s publicClient=false -s serviceAccountsEnabled=true -s 'redirectUris=["*"]'
fi

echo "Configure Google Identity Provider manually via Keycloak admin console as described in docs/AUTH_SETUP.md" >/proc/1/fd/1

wait "$KEYCLOAK_PID"
