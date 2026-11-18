#!/usr/bin/env bash
# Upload the value of an existing Secrets Manager secret without showing it.
#
# Usage: loop8/infra/scripts/put-secret.sh <secret name> <KEY> [<KEY> ...]
# Example: loop8/infra/scripts/put-secret.sh mavenscout/supabase SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_DB_URL
#
# Each KEY is asked for with the typing hidden. An empty answer skips that key.
# The values are stored as one JSON object. Nothing is printed except the key
# names. The temporary file is readable only by you and is deleted on exit.
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <secret name> <KEY> [<KEY> ...]" >&2
  exit 2
fi

secret="$1"
shift
region="${AWS_REGION:-us-east-1}"

# Show where this will run before anything is written.
arn=$(aws sts get-caller-identity --query Arn --output text)
account=$(aws sts get-caller-identity --query Account --output text)
echo "Role:    ${arn##*:}"
echo "Account: ending in ${account: -4}"
echo "Secret:  ${secret} (${region})"
read -r -p "Is this the MavenScout account? Type yes to continue: " answer
[ "$answer" = "yes" ] || { echo "Cancelled." >&2; exit 1; }

# The container must already exist: Terraform creates it, this script only fills it.
aws secretsmanager describe-secret --region "$region" --secret-id "$secret" --query Name --output text >/dev/null

tmp=$(mktemp)
chmod 600 "$tmp"
trap 'rm -f "$tmp"' EXIT

keys=()
for key in "$@"; do
  read -r -s -p "${key} (hidden, empty to skip): " value
  echo
  [ -n "$value" ] || continue
  export "VAL_${key}=${value}"
  keys+=("$key")
done

[ "${#keys[@]}" -gt 0 ] || { echo "No value given, nothing uploaded." >&2; exit 1; }

python3 - "$tmp" "${keys[@]}" <<'PY'
import json, os, sys
out, names = sys.argv[1], sys.argv[2:]
with open(out, "w") as f:
    json.dump({k: os.environ["VAL_" + k] for k in names}, f)
PY

aws secretsmanager put-secret-value --region "$region" --secret-id "$secret" \
  --secret-string "file://${tmp}" --query VersionId --output text >/dev/null
echo "Uploaded keys: ${keys[*]}. The temporary file was deleted."
