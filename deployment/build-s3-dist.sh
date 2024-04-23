#!/bin/bash

########################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
########################################################################################
source ./common.sh

#
# @function usage
#
function usage() {
  echo -e "
------------------------------------------------------------------------------

This script should be run from the repo's deployment directory

------------------------------------------------------------------------------
cd deployment
bash ./build-s3-dist.sh --bucket BUCKET_NAME

where
  --bucket BUCKET_NAME  specify the bucket name where the templates and packages deployed to.
"
  return 0
}

######################################################################
#
# BUCKET must be defined through commandline option
#
# --bucket BUCKET_NAME
#
BUILD_ENV=
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
      -b|--bucket)
      BUCKET="$2"
      shift # past key
      shift # past value
      ;;
      -s|--solution)
      SOLUTION="$2"
      shift # past key
      shift # past value
      ;;
      -v|--version)
      VERSION="$2"
      shift # past key
      shift # past value
      ;;
      -d|--dev)
      BUILD_ENV="dev"
      shift # past key
      ;;
      -r|--single-region)
      SINGLE_REGION=true
      shift # past key
      ;;
      *)
      shift
      ;;
  esac
done

## configure global variables
NODEJS_VERSION=$(node --version)
DEPLOY_DIR="$PWD"
SOURCE_DIR="$DEPLOY_DIR/../source"
TEMPLATE_DIST_DIR="$DEPLOY_DIR/global-s3-assets"
BUILD_DIST_DIR="$DEPLOY_DIR/regional-s3-assets"
TMP_DIR=$(mktemp -d)

# make sure nodejs v20 is installed
[[ ! "${NODEJS_VERSION}" =~ "v20" ]] && \
  echo "error: Node JS Version must be v20" && \
  exit 1

[ "$(which jq)" == "" ] && \
  echo "error: JQ command line tool is required" && \
  exit 1

[ "$(which aws)" == "" ] && \
  echo "error: AWS CLI command line tool is required" && \
  exit 1

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

# bucket account owner
ACCOUNTID=$(aws sts get-caller-identity | jq .Account | tr -d \")
[ -z "$ACCOUNTID" ] && \
  echo "error: fail to get AWS Account ID" && \
  exit 1

# check to make sure the deployment bucket belongs to the same account
[ "$(aws s3api get-bucket-location --bucket ${BUCKET} --expected-bucket-owner ${ACCOUNTID} | jq .LocationConstraint | tr -d \")" == "" ] && \
  echo "error: deployment bucket, \"${BUCKET}\" doesn't belong to the same AWS Account" && \
  exit 1

## Lambda layer package(s)
LAYER_AWSSDK=
LAYER_CORE_LIB=
LAYER_JIMP=

# note: core-lib for custom resource
LOCAL_PKG_CORE_LIB=
## modular workflow package(s)
PKG_CUSTOM_RESOURCES=
PKG_GT_LABELING_STEP=
PKG_CUSTOM_LABELS_STEP=
PKG_STATUS_UPDATER=
PKG_ANALYSIS_STEP=
PKG_IMAGE_ANALYSIS_STEP=
PKG_VIDEO_ANALYSIS_STEP=
PKG_MODEL_TIMER_STREAM=
PKG_API=
PKG_WEBAPP=
## packages for CodeBuild to build FFmpeg on-the-fly
PKG_CODEBUILD_FFMPEG=
PKG_CODEBUILD_CUSTOM_RESOURCES=

## trap exit signal and make sure to remove the TMP_DIR
trap "rm -rf $TMP_DIR" EXIT

function clean_start() {
  echo "------------------------------------------------------------------------------"
  echo "Rebuild distribution"
  echo "------------------------------------------------------------------------------"
  local dir
  # remake dirs
  for dir in "$TEMPLATE_DIST_DIR" "$BUILD_DIST_DIR"; do
    rm -rf "$dir"
    runcmd mkdir -p "$dir"
  done
  # remove .DS_Store
  for dir in "$DEPLOY_DIR" "$SOURCE_DIR"; do
    find "$dir" -name '.DS_Store' -type f -delete
  done
  # delete all package-lock.json
  find "$SOURCE_DIR" -name 'package-lock.json' -type f -delete
}

function install_dev_dependencies() {
  echo "------------------------------------------------------------------------------"
  echo "Install node package dependencies"
  echo "------------------------------------------------------------------------------"
  pushd "$DEPLOY_DIR/.."
  npm install --include=dev
  popd
}

function build_awssdk_layer() {
  echo "------------------------------------------------------------------------------"
  echo "Building aws-sdk layer package"
  echo "------------------------------------------------------------------------------"
  local package="aws-sdk-layer"
  LAYER_AWSSDK="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/layers/${package}"
  npm install
  npm run build
  npm run zip -- "$LAYER_AWSSDK" .
  cp -v "./dist/${LAYER_AWSSDK}" "$BUILD_DIST_DIR"
  popd
}

function build_core_lib_layer() {
  echo "------------------------------------------------------------------------------"
  echo "Building Core Library layer package"
  echo "------------------------------------------------------------------------------"
  local package="core-lib"
  LAYER_CORE_LIB="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/layers/${package}"
  npm install
  npm run build
  npm run zip -- "$LAYER_CORE_LIB" .
  cp -v "./dist/${LAYER_CORE_LIB}" "$BUILD_DIST_DIR"
  # also create a local package for custom resource
  pushd "./dist/nodejs/node_modules/${package}"
  LOCAL_PKG_CORE_LIB="$(pwd)/$(npm pack)"
  popd
  popd
}

function build_jimp_layer() {
  echo "------------------------------------------------------------------------------"
  echo "Building JIMP layer package"
  echo "------------------------------------------------------------------------------"
  local package="jimp"
  LAYER_JIMP="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/layers/${package}"
  npm install
  npm run build
  npm run zip -- "$LAYER_JIMP" .
  cp -v "./dist/${LAYER_JIMP}" "$BUILD_DIST_DIR"
  popd
}

function build_custom_resources_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building custom resources Lambda package"
  echo "------------------------------------------------------------------------------"
  local package="custom-resources"
  PKG_CUSTOM_RESOURCES="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  # explicitly package core-lib into custom resource package
  pushd dist
  echo "=== Merging LOCAL_PKG_CORE_LIB = ${LOCAL_PKG_CORE_LIB} ===="
  npm install --no-save "$LOCAL_PKG_CORE_LIB"
  popd
  #
  npm run zip -- "$PKG_CUSTOM_RESOURCES" .
  cp -v "./dist/$PKG_CUSTOM_RESOURCES" "$BUILD_DIST_DIR"
  popd
}

function build_api_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building API Gateway lambda package"
  echo "------------------------------------------------------------------------------"
  local package="api"
  PKG_API="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_API" .
  cp -v "./dist/$PKG_API" "$BUILD_DIST_DIR"
  popd
}

function build_gt_labeling_step_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building GT Labeling Job Step Functions lambda package"
  echo "------------------------------------------------------------------------------"
  local package="gt-labeling"
  PKG_GT_LABELING_STEP="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_GT_LABELING_STEP" .
  cp -v "./dist/$PKG_GT_LABELING_STEP" "$BUILD_DIST_DIR"
  popd
}

function build_custom_labels_step_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building Custom Labels Step Functions lambda package"
  echo "------------------------------------------------------------------------------"
  local package="custom-labels"
  PKG_CUSTOM_LABELS_STEP="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_CUSTOM_LABELS_STEP" .
  cp -v "./dist/$PKG_CUSTOM_LABELS_STEP" "$BUILD_DIST_DIR"
  popd
}

function build_status_updater_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building Status Updater package"
  echo "------------------------------------------------------------------------------"
  local package="status-updater"
  PKG_STATUS_UPDATER="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_STATUS_UPDATER" .
  cp -v "./dist/$PKG_STATUS_UPDATER" "$BUILD_DIST_DIR"
  popd
}

function build_analysis_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building Analysis package"
  echo "------------------------------------------------------------------------------"
  local package="analysis"
  PKG_ANALYSIS_STEP="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_ANALYSIS_STEP" .
  cp -v "./dist/$PKG_ANALYSIS_STEP" "$BUILD_DIST_DIR"
  popd
}

function build_image_analysis_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building Image Analysis package"
  echo "------------------------------------------------------------------------------"
  local package="analysis-image"
  PKG_IMAGE_ANALYSIS_STEP="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_IMAGE_ANALYSIS_STEP" .
  cp -v "./dist/$PKG_IMAGE_ANALYSIS_STEP" "$BUILD_DIST_DIR"
  popd
}

function build_video_analysis_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building Video Analysis package"
  echo "------------------------------------------------------------------------------"
  local package="analysis-video"
  PKG_VIDEO_ANALYSIS_STEP="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_VIDEO_ANALYSIS_STEP" .
  cp -v "./dist/$PKG_VIDEO_ANALYSIS_STEP" "$BUILD_DIST_DIR"
  popd
}

function build_model_timer_stream_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building Model Timer Stream package"
  echo "------------------------------------------------------------------------------"
  local package="model-timer-stream"
  PKG_MODEL_TIMER_STREAM="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_MODEL_TIMER_STREAM" .
  cp -v "./dist/$PKG_MODEL_TIMER_STREAM" "$BUILD_DIST_DIR"
  popd
}

function minify_jscript() {
  echo "------------------------------------------------------------------------------"
  echo "Minify Webapp code"
  echo "------------------------------------------------------------------------------"
  local file=$1
  pushd "$SOURCE_DIR/build"
  npm install --omit=dev
  node post-build.js minify --dir "$file"
  [ $? -ne 0 ] && exit 1
  popd
}

function compute_jscript_integrity() {
  echo "------------------------------------------------------------------------------"
  echo "Compute and Inject Integrity check to webapp"
  echo "------------------------------------------------------------------------------"
  local file=$1
  pushd "$SOURCE_DIR/build"
  npm install --omit=dev
  node post-build.js inject-sri --html "$file"
  [ $? -ne 0 ] && exit 1
  popd
}

function build_thirdparty_bundle() {
  echo "------------------------------------------------------------------------------"
  echo "Building $1"
  echo "------------------------------------------------------------------------------"
  local bundle=$1
  local bundle_dir="$SOURCE_DIR/webapp/third_party/$bundle"

  pushd "$bundle_dir"
  npm install --omit=dev
  npm run build
  [ $? -ne 0 ] && exit 1
  popd
}

function build_webapp_dependencies() {
  echo "------------------------------------------------------------------------------"
  echo "Building webapp dependenceis for browser"
  echo "------------------------------------------------------------------------------"
  local bundles=(\
    "amazon-cognito-identity-bundle" \
    "aws-sdk-bundle" \
    "bootstrap-bundle" \
    "crypto-js-bundle" \
    "fontawesome-bundle" \
    "jquery-bundle" \
    "videojs-bundle" \
    "videojs-markers-bundle" \
    "chartjs-bundle" \
  )
  for bundle in ${bundles[@]}
  do
    build_thirdparty_bundle $bundle
  done;

  # copy all dependencies to webapp/third_party/dist
  local srcdir="$SOURCE_DIR/webapp/third_party"
  local dstdir="$SOURCE_DIR/webapp/third_party/dist"

  rm -rf "$dstdir" && mkdir -p "$dstdir"
  cp -rv "$srcdir"/*/dist/js "$dstdir"
  cp -rv "$srcdir"/*/dist/css "$dstdir"
  cp -rv "$srcdir"/*/dist/webfonts "$dstdir"
}

function build_webapp_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building webapp package"
  echo "------------------------------------------------------------------------------"
  local package="webapp"
  PKG_WEBAPP="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build

  # start building all third party bundles
  build_webapp_dependencies

  # copy all dependencies to webapp/dist/third_party
  local srcdir="$SOURCE_DIR/${package}/third_party/dist"
  local dstdir="$SOURCE_DIR/${package}/dist/third_party/dist"
  mkdir -p "$dstdir"
  cp -rv "$srcdir/" "$dstdir"

  minify_jscript "$SOURCE_DIR/${package}/dist/src/lib/js"
  compute_jscript_integrity "$SOURCE_DIR/${package}/dist/index.html"

  # now, zip and package all the files
  npm run zip -- "$PKG_WEBAPP" . -x ./dev**
  cp -v "./dist/$PKG_WEBAPP" "$BUILD_DIST_DIR"
  popd
}

function build_codebuild_custom_resources_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building Custom Resoruces for CodeBuild package"
  echo "------------------------------------------------------------------------------"
  local package="codebuild-custom-resources"
  PKG_CODEBUILD_CUSTOM_RESOURCES="${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_CODEBUILD_CUSTOM_RESOURCES" .
  cp -v "./dist/${PKG_CODEBUILD_CUSTOM_RESOURCES}" "$BUILD_DIST_DIR"
  popd
}

function build_codebuild_ffmpeg_package() {
  echo "------------------------------------------------------------------------------"
  echo "Building FFMPEG layer package"
  echo "------------------------------------------------------------------------------"
  local package="ffmpeg"
  PKG_CODEBUILD_FFMPEG="codebuild-${package}-${VERSION}.zip"
  pushd "$SOURCE_DIR/layers/${package}"
  npm install
  npm run build
  npm run zip -- "$PKG_CODEBUILD_FFMPEG" .
  cp -v "./dist/${PKG_CODEBUILD_FFMPEG}" "$BUILD_DIST_DIR"
  popd
}

function build_cloudformation_templates() {
  echo "------------------------------------------------------------------------------"
  echo "CloudFormation Templates"
  echo "------------------------------------------------------------------------------"
  # copy yaml to dist folder
  runcmd cp -rv *.yaml "$TEMPLATE_DIST_DIR/"
  pushd "$TEMPLATE_DIST_DIR"

  # solution name
  echo "Updating %SOLUTION% param in cloudformation templates..."
  sed -i'.bak' -e "s|%SOLUTION%|${SOLUTION}|g" *.yaml || exit 1

  # solution version
  echo "Updating %VERSION% param in cloudformation templates..."
  sed -i'.bak' -e "s|%VERSION%|${VERSION}|g" *.yaml || exit 1

  # solution id
  echo "Updating %SID% param in cloudformation templates..."
  sed -i'.bak' -e "s|%SID%|${SID}|g" *.yaml || exit 1

  # solution id (lowercase)
  local solutionId=$(echo ${SID} | tr "[:upper:]" "[:lower:]")
  echo "Updating %SMALLCAP_SID% param in cloudformation templates..."
  sed -i'.bak' -e "s|%SMALLCAP_SID%|${solutionId}|g" *.yaml || exit 1

  # deployment bucket name
  echo "Updating %BUCKET% param in cloudformation templates..."
  sed -i'.bak' -e "s|%BUCKET%|${BUCKET}|g" *.yaml || exit 1

  # key prefix name
  local keyprefix="${SOLUTION}/${VERSION}"
  echo "Updating %KEYPREFIX% param in cloudformation templates..."
  sed -i'.bak' -e "s|%KEYPREFIX%|${keyprefix}|g" *.yaml || exit 1

  # single region flag
  echo "Updating %SINGLE_REGION% param in cloudformation templates..."
  sed -i'.bak' -e "s|%SINGLE_REGION%|${SINGLE_REGION}|g" *.yaml || exit 1

  # layer(s)
  echo "Updating %LAYER_AWSSDK% param in cloudformation templates..."
  sed -i'.bak' -e "s|%LAYER_AWSSDK%|${LAYER_AWSSDK}|g" *.yaml || exit 1

  echo "Updating %LAYER_CORE_LIB% param in cloudformation templates..."
  sed -i'.bak' -e "s|%LAYER_CORE_LIB%|${LAYER_CORE_LIB}|g" *.yaml || exit 1

  echo "Updating %LAYER_JIMP% param in cloudformation templates..."
  sed -i'.bak' -e "s|%LAYER_JIMP%|${LAYER_JIMP}|g" *.yaml || exit 1

  # package(s)
  echo "Updating %PKG_CUSTOM_RESOURCES% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_CUSTOM_RESOURCES%|${PKG_CUSTOM_RESOURCES}|g" *.yaml || exit 1

  echo "Updating %PKG_GT_LABELING_STEP% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_GT_LABELING_STEP%|${PKG_GT_LABELING_STEP}|g" *.yaml || exit 1

  echo "Updating %PKG_CUSTOM_LABELS_STEP% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_CUSTOM_LABELS_STEP%|${PKG_CUSTOM_LABELS_STEP}|g" *.yaml || exit 1

  echo "Updating %PKG_STATUS_UPDATER% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_STATUS_UPDATER%|${PKG_STATUS_UPDATER}|g" *.yaml || exit 1

  echo "Updating %PKG_ANALYSIS_STEP% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_ANALYSIS_STEP%|${PKG_ANALYSIS_STEP}|g" *.yaml || exit 1

  echo "Updating %PKG_IMAGE_ANALYSIS_STEP% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_IMAGE_ANALYSIS_STEP%|${PKG_IMAGE_ANALYSIS_STEP}|g" *.yaml || exit 1

  echo "Updating %PKG_VIDEO_ANALYSIS_STEP% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_VIDEO_ANALYSIS_STEP%|${PKG_VIDEO_ANALYSIS_STEP}|g" *.yaml || exit 1

  echo "Updating %PKG_MODEL_TIMER_STREAM% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_MODEL_TIMER_STREAM%|${PKG_MODEL_TIMER_STREAM}|g" *.yaml || exit 1

  echo "Updating %PKG_API% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_API%|${PKG_API}|g" *.yaml || exit 1

  echo "Updating %PKG_WEBAPP% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_WEBAPP%|${PKG_WEBAPP}|g" *.yaml || exit 1

  echo "Updating %PKG_CODEBUILD_CUSTOM_RESOURCES% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_CODEBUILD_CUSTOM_RESOURCES%|${PKG_CODEBUILD_CUSTOM_RESOURCES}|g" *.yaml || exit 1

  echo "Updating %PKG_CODEBUILD_FFMPEG% param in cloudformation templates..."
  sed -i'.bak' -e "s|%PKG_CODEBUILD_FFMPEG%|${PKG_CODEBUILD_FFMPEG}|g" *.yaml || exit 1

  # remove .bak
  runcmd rm -v *.bak
  # rename .yaml to .template
  find . -name "*.yaml" -exec bash -c 'mv -v "$0" "${0%.yaml}.template"' {} \;
  # copy templates to regional bucket as well
  cp -v *.template "$BUILD_DIST_DIR"

  popd
}

function on_complete() {
  echo "------------------------------------------------------------------------------"
  echo "S3 Packaging Complete. (${SOLUTION} ${VERSION})"
  echo "------------------------------------------------------------------------------"
  echo "** LAYER_AWSSDK=${LAYER_AWSSDK} **"
  echo "** LAYER_JIMP=${LAYER_JIMP} **"
  echo "** LAYER_CORE_LIB=${LAYER_CORE_LIB} **"
  echo "** PKG_CUSTOM_RESOURCES=${PKG_CUSTOM_RESOURCES} **"
  echo "** PKG_GT_LABELING_STEP=${PKG_GT_LABELING_STEP} **"
  echo "** PKG_CUSTOM_LABELS_STEP=${PKG_CUSTOM_LABELS_STEP} **"
  echo "** PKG_STATUS_UPDATER=${PKG_STATUS_UPDATER} **"
  echo "** PKG_ANALYSIS_STEP=${PKG_ANALYSIS_STEP} **"
  echo "** PKG_IMAGE_ANALYSIS_STEP=${PKG_IMAGE_ANALYSIS_STEP} **"
  echo "** PKG_VIDEO_ANALYSIS_STEP=${PKG_VIDEO_ANALYSIS_STEP} **"
  echo "** PKG_MODEL_TIMER_STREAM=${PKG_MODEL_TIMER_STREAM} **"
  echo "** PKG_API=${PKG_API} **"
  echo "** PKG_WEBAPP=${PKG_WEBAPP} **"
  echo "** PKG_CODEBUILD_FFMPEG=${PKG_CODEBUILD_FFMPEG} **"
  echo "** PKG_CODEBUILD_CUSTOM_RESOURCES=${PKG_CODEBUILD_CUSTOM_RESOURCES} **"
}

clean_start
install_dev_dependencies
build_awssdk_layer
build_core_lib_layer
build_jimp_layer
build_custom_resources_package
build_api_package
build_gt_labeling_step_package
build_custom_labels_step_package
build_status_updater_package
build_analysis_package
build_image_analysis_package
build_video_analysis_package
build_model_timer_stream_package
build_codebuild_custom_resources_package
build_codebuild_ffmpeg_package
build_webapp_package
build_cloudformation_templates
on_complete
