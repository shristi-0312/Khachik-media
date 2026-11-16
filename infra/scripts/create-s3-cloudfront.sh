#!/usr/bin/env bash
# Creates the S3 bucket + CloudFront distribution for media.
# Requires: aws CLI configured, jq
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
BUCKET="${S3_BUCKET:-khachik-media-assets}"
ADMIN_ORIGIN="${ADMIN_ORIGIN:-https://admin.yourdomain.com}"
SITE_ORIGIN="${SITE_ORIGIN:-https://khachik-media.vercel.app}"

echo "Creating bucket s3://${BUCKET} in ${REGION}..."
if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET"
  else
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
fi

aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration "{
  \"CORSRules\": [{
    \"AllowedHeaders\": [\"*\"],
    \"AllowedMethods\": [\"GET\", \"PUT\", \"POST\", \"HEAD\", \"DELETE\"],
    \"AllowedOrigins\": [
      \"${ADMIN_ORIGIN}\",
      \"${SITE_ORIGIN}\",
      \"https://65-2-150-121.sslip.io\",
      \"http://65-2-150-121.sslip.io\",
      \"https://65.2.150.121\",
      \"http://65.2.150.121\",
      \"http://localhost:5173\",
      \"http://localhost:5174\",
      \"http://127.0.0.1:5173\",
      \"http://127.0.0.1:5174\"
    ],
    \"ExposeHeaders\": [\"ETag\", \"Content-Type\", \"Content-Length\", \"x-amz-request-id\", \"x-amz-id-2\"],
    \"MaxAgeSeconds\": 3000
  }]
}"

echo "Creating Origin Access Control..."
OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config "{
    \"Name\": \"${BUCKET}-oac\",
    \"Description\": \"OAC for ${BUCKET}\",
    \"SigningProtocol\": \"sigv4\",
    \"SigningBehavior\": \"always\",
    \"OriginAccessControlOriginType\": \"s3\"
  }" \
  --query 'OriginAccessControl.Id' \
  --output text 2>/dev/null || true)

if [[ -z "${OAC_ID}" || "${OAC_ID}" == "None" ]]; then
  OAC_ID=$(aws cloudfront list-origin-access-controls \
    --query "OriginAccessControlList.Items[?Name=='${BUCKET}-oac'].Id | [0]" \
    --output text)
fi

CALLER_REF="khachik-$(date +%s)"
S3_DOMAIN="${BUCKET}.s3.${REGION}.amazonaws.com"

echo "Creating CloudFront distribution..."
DIST_JSON=$(aws cloudfront create-distribution --distribution-config "{
  \"CallerReference\": \"${CALLER_REF}\",
  \"Comment\": \"Khachik Media assets\",
  \"Enabled\": true,
  \"Origins\": {
    \"Quantity\": 1,
    \"Items\": [{
      \"Id\": \"s3-${BUCKET}\",
      \"DomainName\": \"${S3_DOMAIN}\",
      \"S3OriginConfig\": { \"OriginAccessIdentity\": \"\" },
      \"OriginAccessControlId\": \"${OAC_ID}\"
    }]
  },
  \"DefaultCacheBehavior\": {
    \"TargetOriginId\": \"s3-${BUCKET}\",
    \"ViewerProtocolPolicy\": \"redirect-to-https\",
    \"AllowedMethods\": {
      \"Quantity\": 2,
      \"Items\": [\"GET\", \"HEAD\"],
      \"CachedMethods\": { \"Quantity\": 2, \"Items\": [\"GET\", \"HEAD\"] }
    },
    \"Compress\": true,
    \"ForwardedValues\": {
      \"QueryString\": false,
      \"Cookies\": { \"Forward\": \"none\" }
    },
    \"MinTTL\": 0,
    \"DefaultTTL\": 86400,
    \"MaxTTL\": 31536000
  }
}")

DIST_ID=$(echo "$DIST_JSON" | jq -r '.Distribution.Id')
DIST_DOMAIN=$(echo "$DIST_JSON" | jq -r '.Distribution.DomainName')
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontServicePrincipalRead",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${BUCKET}/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DIST_ID}"
      }
    }
  }]
}
EOF
)

aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$POLICY"

echo ""
echo "Done."
echo "S3_BUCKET=${BUCKET}"
echo "CLOUDFRONT_URL=https://${DIST_DOMAIN}"
echo "DistributionId=${DIST_ID}"
echo "Attach an IAM role to EC2 with s3:PutObject/GetObject/DeleteObject on arn:aws:s3:::${BUCKET}/*"
