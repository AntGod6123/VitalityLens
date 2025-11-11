#!/bin/bash
set -euo pipefail

REALM=${KEYCLOAK_REALM:-app}
CLIENT_WEB=${KEYCLOAK_WEB_CLIENT_ID:-web-client}
CLIENT_API=${KEYCLOAK_API_CLIENT_ID:-core-api}
DEFAULT_USER_USERNAME=${KEYCLOAK_DEFAULT_USER:-demo}
DEFAULT_USER_PASSWORD=${KEYCLOAK_DEFAULT_USER_PASSWORD:-demoPass123!}
DEFAULT_USER_EMAIL=${KEYCLOAK_DEFAULT_USER_EMAIL:-demo@example.com}

/opt/keycloak/bin/kc.sh start-dev &
KEYCLOAK_PID=$!

cleanup() {
  if kill -0 "$KEYCLOAK_PID" >/dev/null 2>&1; then
    kill "$KEYCLOAK_PID"
  fi
}
trap cleanup EXIT

until curl -sf http://localhost:8080/realms/master/.well-known/openid-configuration >/dev/null; do
  echo "Waiting for Keycloak to start..." >/proc/1/fd/1
  sleep 5
done

echo "Configuring realm ${REALM}" >/proc/1/fd/1

/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"

if ! /opt/keycloak/bin/kcadm.sh get realms/${REALM} >/dev/null 2>&1; then
  /opt/keycloak/bin/kcadm.sh create realms -s realm=${REALM} -s enabled=true
fi

if ! /opt/keycloak/bin/kcadm.sh get clients -r ${REALM} --query clientId=${CLIENT_WEB} | grep -q ${CLIENT_WEB}; then
  /opt/keycloak/bin/kcadm.sh create clients -r ${REALM} -s clientId=${CLIENT_WEB} -s enabled=true -s publicClient=true -s 'redirectUris=["*"]' -s 'webOrigins=["*"]'
fi

if ! /opt/keycloak/bin/kcadm.sh get clients -r ${REALM} --query clientId=${CLIENT_API} | grep -q ${CLIENT_API}; then
  /opt/keycloak/bin/kcadm.sh create clients -r ${REALM} -s clientId=${CLIENT_API} -s enabled=true -s publicClient=false -s serviceAccountsEnabled=true -s 'redirectUris=["*"]'
fi

if ! /opt/keycloak/bin/kcadm.sh get users -r ${REALM} --query username=${DEFAULT_USER_USERNAME} | grep -q '"username" :'; then
  TMPFILE=$(mktemp)
  cat > "$TMPFILE" <<USERJSON
{
  "username": "${DEFAULT_USER_USERNAME}",
  "email": "${DEFAULT_USER_EMAIL}",
  "enabled": true,
  "emailVerified": true,
  "credentials": [
    {"type": "password", "value": "${DEFAULT_USER_PASSWORD}", "temporary": false}
  ]
}
USERJSON
  /opt/keycloak/bin/kcadm.sh create users -r ${REALM} -f "$TMPFILE"
  rm "$TMPFILE"
  echo "Created default user ${DEFAULT_USER_USERNAME}" >/proc/1/fd/1
else
  echo "Default user ${DEFAULT_USER_USERNAME} already present" >/proc/1/fd/1
fi

echo "Configure Google Identity Provider manually via Keycloak admin console as described in docs/AUTH_SETUP.md" >/proc/1/fd/1

wait "$KEYCLOAK_PID"
