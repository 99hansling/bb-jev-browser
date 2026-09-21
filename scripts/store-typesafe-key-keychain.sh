#!/bin/zsh
# Store TypeSafe API key in macOS login Keychain. Never commit the key.
# Usage: ./scripts/store-typesafe-key-keychain.sh
#        echo -n "$KEY" | ./scripts/store-typesafe-key-keychain.sh --stdin
set -euo pipefail
SERVICE="typesafe"
ACCOUNT="${USER}"

if [[ "${1:-}" == "--stdin" ]]; then
  KEY="$(cat)"
else
  print -n "Paste TYPESAFE_API_KEY (input hidden): "
  stty -echo
  read -r KEY
  stty echo
  print
fi

if [[ -z "${KEY}" ]]; then
  print "empty key; abort" >&2
  exit 1
fi

# Replace if exists
security delete-generic-password -a "$ACCOUNT" -s "$SERVICE" >/dev/null 2>&1 || true
security add-generic-password -a "$ACCOUNT" -s "$SERVICE" -w "$KEY" -U
print "OK: Keychain item service=$SERVICE account=$ACCOUNT (value not printed)"
print "Verify: security find-generic-password -a \"$ACCOUNT\" -s \"$SERVICE\" >/dev/null && echo present"
