#!/usr/bin/env bash
# Attach a Response Headers Policy: CORS for WebGL + long browser cache hints.
# Safe to re-run. Requires AWS CLI + jq and infra/.env (or env vars).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -f "$ROOT/infra/.env" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/infra/.env" && set +a
fi

: "${AWS_REGION:=ap-south-1}"
: "${CLOUDFRONT_URL:?Set CLOUDFRONT_URL}"

DOMAIN="${CLOUDFRONT_URL#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/}"

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?DomainName=='${DOMAIN}'].Id | [0]" \
  --output text)

if [[ -z "$DIST_ID" || "$DIST_ID" == "None" ]]; then
  echo "No CloudFront distribution found for ${DOMAIN}"
  exit 1
fi

POLICY_NAME="khachik-media-cors-cache-$(date +%Y%m%d)"
echo "Creating response headers policy ${POLICY_NAME}..."

POLICY_ID=$(aws cloudfront create-response-headers-policy --response-headers-policy-config "{
  \"Name\": \"${POLICY_NAME}\",
  \"Comment\": \"CORS + security headers for Khachik media\",
  \"CorsConfig\": {
    \"AccessControlAllowOrigins\": { \"Quantity\": 1, \"Items\": [\"*\"] },
    \"AccessControlAllowHeaders\": { \"Quantity\": 1, \"Items\": [\"*\"] },
    \"AccessControlAllowMethods\": { \"Quantity\": 3, \"Items\": [\"GET\", \"HEAD\", \"OPTIONS\"] },
    \"AccessControlAllowCredentials\": false,
    \"AccessControlExposeHeaders\": { \"Quantity\": 1, \"Items\": [\"ETag\"] },
    \"AccessControlMaxAgeSec\": 86400,
    \"OriginOverride\": true
  },
  \"CustomHeadersConfig\": {
    \"Quantity\": 1,
    \"Items\": [{
      \"Header\": \"Cache-Control\",
      \"Value\": \"public, max-age=31536000, immutable\",
      \"Override\": false
    }]
  },
  \"SecurityHeadersConfig\": {
    \"ContentTypeOptions\": { \"Override\": true }
  }
}" --query 'ResponseHeadersPolicy.Id' --output text 2>/dev/null || true)

if [[ -z "${POLICY_ID:-}" || "$POLICY_ID" == "None" ]]; then
  echo "Policy may already exist; listing..."
  POLICY_ID=$(aws cloudfront list-response-headers-policies --type custom \
    --query "ResponseHeadersPolicyList.Items[?ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name!=null].ResponseHeadersPolicy|[?ResponseHeadersPolicyConfig.Name!=null]|[-1].Id" \
    --output text 2>/dev/null || true)
fi

# Prefer matching by name prefix
POLICY_ID=$(aws cloudfront list-response-headers-policies --type custom \
  --query "ResponseHeadersPolicyList.Items[?starts_with(ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name, 'khachik-media-cors-cache')].ResponseHeadersPolicy.Id | [0]" \
  --output text)

echo "PolicyId=${POLICY_ID}"
echo "DistId=${DIST_ID}"

ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --query ETag --output text)
aws cloudfront get-distribution-config --id "$DIST_ID" --output json > /tmp/khachik-cf-dist.json
python3 - <<PY
import json
with open("/tmp/khachik-cf-dist.json") as f:
    data = json.load(f)
cfg = data["DistributionConfig"]
beh = cfg["DefaultCacheBehavior"]
beh["ResponseHeadersPolicyId"] = "${POLICY_ID}"
# Prefer CachingOptimized + long TTLs already set on objects
cfg["DefaultCacheBehavior"] = beh
with open("/tmp/khachik-cf-dist-updated.json", "w") as f:
    json.dump(cfg, f)
PY

aws cloudfront update-distribution \
  --id "$DIST_ID" \
  --if-match "$ETAG" \
  --distribution-config file:///tmp/khachik-cf-dist-updated.json \
  >/tmp/khachik-cf-update.json

echo "Attached response headers policy to ${DIST_ID}."
echo "Propagation can take a few minutes."
