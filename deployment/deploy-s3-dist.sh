#!/bin/bash

########################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
########################################################################################

# include shared configuration file
source ./common.sh

ACCOUNTID=
NODEJS_VERSION=$(node --version)
DEPLOY_DIR="$PWD"
SOURCE_DIR="$DEPLOY_DIR/../source"
TEMPLATE_DIST_DIR="global-s3-assets"
BUID_DIST_DIR="regional-s3-assets"
MAIN_TEMPLATE="amazon-rekognition-custom-brand-detection.template"


#
# @function usage
#
function usage() {
  echo -e "
------------------------------------------------------------------------------

This script helps you to deploy CloudFormation templates to the bucket(s).
It should be run from the repo's deployment directory

------------------------------------------------------------------------------
cd deployment
bash ./deploy-s3-dist.sh --bucket BUCKET_NAME [--acl ACL_SETTING] [--profile AWS_PROFILE]

where
  --bucket BUCKET_NAME        specify the bucket name where the templates and packages deployed to.

  --acl ACL_SETTING           [optional] if not specified, it deploys with 'bucket-owner-full-control' access
                              control setting. You could specify 'public-read' if you plan to share the solution
                              with other AWS accounts. Note that it requires your bucket to be configured to permit
                              'public-read' acl settings

  --profile AWS_PROFILE       [optional] specify the AWS CLI profile. If not specified, it assumes 'default'
"
  return 0
}

######################################################################
#
# optional flags
#
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
      -b|--bucket)
      BUCKET="$2"
      shift # past argument
      shift # past value
      ;;
      -s|--solution)
      SOLUTION="$2"
      shift # past key
      shift # past value
      ;;
      -v|--version)
      VERSION="$2"
      shift # past argument
      shift # past value
      ;;
      --single-region)
      SINGLE_REGION=true
      shift # past argument
      ;;
      -a|--acl)
      ACL_SETTING="$2"
      shift # past argument
      shift # past value
      ;;
      -p|--profile)
      PROFILE="$2"
      shift # past argument
      shift # past value
      ;;
      *)
      shift
      ;;
  esac
done

[ -z "$BUCKET" ] && \
  echo "error: missing --bucket parameter..." && \
  usage && \
  exit 1

[ -z "$VERSION" ] && \
  VERSION=$(cat "$SOURCE_DIR/.version")

[ -z "$VERSION" ] && \
  echo "error: can't find the versioning, please use --version parameter..." && \
  usage && \
  exit 1

[ -z "$SOLUTION" ] && \
  SOLUTION="custom-brand-detection"

[ -z "$SINGLE_REGION" ] && \
  SINGLE_REGION=true

[ -z "$ACL_SETTING" ] && \
  ACL_SETTING="bucket-owner-full-control"

[ -z "$PROFILE" ] && \
  PROFILE="default"

ACCOUNTID=$(aws sts get-caller-identity | jq .Account | tr -d \")
[ -z "$ACCOUNTID" ] && \
  echo "error: fail to get AWS Account ID" && \
  exit 1

#
# @function copy_to_bucket
# @description copy solution to regional bucket
#
function copy_to_bucket() {
  local bucket=$1
  # full packages deployed to versioned folder
  local fullPackages=$BUID_DIST_DIR
  local versionFolder=s3://${bucket}/${SOLUTION}/${VERSION}/
  # main templates deployed to latest folder
  local mainTemplate=$TEMPLATE_DIST_DIR
  local latestFolder=s3://${bucket}/${SOLUTION}/latest/

  # get bucket region and ensure bucket is owned by the same AWS account. LocationConstraint returns null if bucket is in us-east-1 region
  local location=$(aws s3api get-bucket-location --bucket ${bucket} --expected-bucket-owner ${ACCOUNTID} | jq .LocationConstraint | tr -d \")
  [ -z "$location" ] && \
    echo "Bucket '${bucket}' either doesn't exist or doesn't belong to accountId '${ACCOUNTID}'. exiting..." && \
    exit 1

  local region="us-east-1"
  [ "$location" != "null" ] && \
    region=$location

  local domain="s3.amazonaws.com"
  local optionalFlag="--acl ${ACL_SETTING} --profile ${PROFILE}"

  if [ "$region" != "us-east-1" ]; then
    domain=s3.${region}.amazonaws.com
    optionalFlag="${optionalFlag} --region ${region}"
  fi

  # upload artifacts to bucket
  echo "== Deploy '${SOLUTION} ($VERSION)' package from '${fullPackages}' to '${versionFolder}' in '${region}' [BEGIN] =="
  aws s3 cp $fullPackages $versionFolder --recursive $optionalFlag
  aws s3 cp $mainTemplate $latestFolder --recursive $optionalFlag
  echo "== Deploy '${SOLUTION} ($VERSION)' package from '${fullPackages}' to '${versionFolder}' in '${region}' [COMPLETED] =="

  local url="https://${bucket}.${domain}/${SOLUTION}/${VERSION}/${MAIN_TEMPLATE}"
  local latestUrl="https://${bucket}.${domain}/${SOLUTION}/latest/${MAIN_TEMPLATE}"

  echo "== (VERSIONED URL) ============================"
  echo ""
  echo "HTTPS URL:"
  echo "$url"
  echo ""
  echo "One-click URL to create stack:"
  echo "https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/quickcreate?templateURL=${url}&stackName=custom-brand"
  echo ""

  echo "== (LATEST URL) ==============================="
  echo ""
  echo "$latestUrl"
  echo ""
  echo "One-click URL to create stack:"
  echo "https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/quickcreate?templateURL=${latestUrl}&stackName=custom-brand"
  echo ""
}

#
# main program
#
if [ "$SINGLE_REGION" == "true" ]; then
  copy_to_bucket "${BUCKET}"
else
  for region in ${REGIONS[@]}; do
    copy_to_bucket "${BUCKET}-${region}"
  done
fi
