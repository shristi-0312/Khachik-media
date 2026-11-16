#!/usr/bin/env bash
# Stamp long-lived Cache-Control on existing media objects so CloudFront and
# browsers keep full-quality originals warm for return visits.
# Preserves / restores Content-Type from the object key extension.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "${ROOT}/.env"

: "${S3_BUCKET:?S3_BUCKET missing in infra/.env}"
: "${AWS_REGION:=ap-south-1}"

CACHE_CONTROL='public, max-age=31536000, immutable'
PREFIX="${1:-media/}"

content_type_for() {
  case "${1##*.}" in
    mp4|MP4) echo 'video/mp4' ;;
    mov|MOV) echo 'video/quicktime' ;;
    webm|WEBM) echo 'video/webm' ;;
    jpg|jpeg|JPG|JPEG) echo 'image/jpeg' ;;
    png|PNG) echo 'image/png' ;;
    webp|WEBP) echo 'image/webp' ;;
    gif|GIF) echo 'image/gif' ;;
    txt|TXT) echo 'text/plain' ;;
    *) echo 'application/octet-stream' ;;
  esac
}

echo "Backfilling Cache-Control on s3://${S3_BUCKET}/${PREFIX} (${AWS_REGION})..."

KEYS=$(aws s3api list-objects-v2 \
  --bucket "${S3_BUCKET}" \
  --prefix "${PREFIX}" \
  --region "${AWS_REGION}" \
  --query 'Contents[].Key' \
  --output text)

if [ -z "${KEYS}" ] || [ "${KEYS}" = "None" ]; then
  echo "No objects under ${PREFIX}"
  exit 0
fi

echo "${KEYS}" | tr '\t' '\n' | while read -r key; do
  [ -z "${key}" ] && continue
  ct="$(content_type_for "${key}")"
  aws s3api copy-object \
    --bucket "${S3_BUCKET}" \
    --key "${key}" \
    --copy-source "${S3_BUCKET}/${key}" \
    --metadata-directive REPLACE \
    --content-type "${ct}" \
    --cache-control "${CACHE_CONTROL}" \
    --region "${AWS_REGION}" \
    >/dev/null
  echo "ok ${key} -> ${ct}"
done

echo "Done. New viewers will cache full-quality CDN assets for up to 1 year."
echo "Optional: invalidate CloudFront if edges still hold old headers:"
echo "  aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths '/media/*'"
