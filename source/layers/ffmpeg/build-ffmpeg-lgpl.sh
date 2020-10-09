#!/bin/bash

function usage() {
  echo -e "
------------------------------------------------------------------------------

This script should be run from Amazon Linux 2

------------------------------------------------------------------------------
bash ./build-ffmpeg-lgpl.sh --version VERSION --deploy DEPLOY_BUCKET [--signal BASE64_CFN_URL]

where
  --version VERSION         specify FFmpeg version to build (GIT release tag), default to 'n4.3.1'
  --deploy  DEPLOY_BUCKET   specify the deploy bucket of the FFmpeg Lambda Layer package; i.e. <bucket-name>
  --signal  BASE64_CFN_URL  [optional] specify CloudFormation Signal URL to report codebuild status to the CFN Stack
"
  return 0
}

function sendSignal() {
  local url=$CLOUDFORMATION_URL
  [ -z "$url" ] &&
    return 0

  local status="$1"
  local data="$2"
  local uuid=$(uuidgen)
  local reason="FFmpeg CodeBuild ${status}"
  local data="{\"Status\": \"$status\", \"Reason\": \"$reason\", \"UniqueId\": \"$uuid\", \"Data\": \"${data}\"}"

  echo "Data: $data"
  curl -X PUT \
    -H 'Content-Type:' \
    --data-binary "$data" \
    "$url"
  return 0
}

function onCompleted() {
  echo "== onCompleted =="
  # send signal to CloudFormation stack
  local data=$(echo "{\"Bucket\":\"$1\",\"Key\":\"$2\"}" | base64 -w 0)
  sendSignal "SUCCESS" "$data"
  exit 0
}

function onFailure() {
  echo "== onFailure =="
  echo "ERR: $1"
  # send signal to CloudFormation stack
  sendSignal "FAILURE" "{\"ErrorMessage\":\"$1\"}"
  exit 1
}

function checkCmdOptions() {
  echo "== Checking Commandline Options ($(date)) =="

  [ -z "$DEPLOY_BUCKET" ] && \
    usage && \
    onFailure "missing --deploy DEPLOY_BUCKET..."

  local ffmpegSkeletonPackage="$ROOT_DIR/nodejs/node_modules/ffmpeg"
  [ ! -f "$ffmpegSkeletonPackage/index.js" ] && \
    onFailure " missing '$ffmpegSkeletonPackage/index.js'"
  [ ! -f "$ffmpegSkeletonPackage/package.json" ] && \
    onFailure " missing '$ffmpegSkeletonPackage/package.json'"

  [ -z "$VERSION" ] && \
    VERSION="n4.3.1"

  echo "== Will build FFmpeg ($VERSION) and deploy to S3 ($DEPLOY_BUCKET) =="
  return 0
}

function installDependencies() {
  echo "== Installing FFmpeg Compilation Dependencies ($(date)) =="

  yum update -q -y
  yum groupinstall -q -y "Development Tools"

  yum install -q -y \
    autoconf \
    automake \
    bzip2 \
    bzip2-devel \
    cmake \
    freetype-devel \
    gcc \
    gcc-c++ \
    git \
    libtool \
    make \
    mercurial \
    pkgconfig \
    zlib-devel \
    openssl-devel
  [ $? -ne 0 ] && \
    onFailure "failed to install FFmpeg compilation dependecies"

  echo "== Installing FFmpeg Compilation Dependencies ($(date)) [Completed] =="
  return 0
}

function buildNASM() {
  local version="2.14.02"
  local package="nasm-$version.tar.bz2"

  echo "== Building NASM $version ($(date)) =="

  curl -q -O -L https://www.nasm.us/pub/nasm/releasebuilds/$version/$package
  [ $? -ne 0 ] && \
    onFailure "failed to download NASM code"

  tar xjf $package
  [ $? -ne 0 ] && \
    onFailure "failed to untar '$package'"

  pushd nasm-$version
  ./autogen.sh && \
  ./configure --prefix="$BD_PREFIX" --bindir="$BD_BIN" && \
  make && make install
  [ $? -ne 0 ] && \
    onFailure "failed to build NASM code"
  popd

  echo "== Building NASM $version ($(date)) [Completed] =="
  return 0
}

function buildYASM() {
  local version="1.3.0"
  local package="yasm-$version.tar.gz"

  echo "== Building YASM $version ($(date)) =="

  curl -q -O -L https://www.tortall.net/projects/yasm/releases/$package
  [ $? -ne 0 ] && \
    onFailure "failed to download YASM code"

  tar xzf $package
  [ $? -ne 0 ] && \
    onFailure "failed to untar '$package'"

  pushd yasm-$version
  ./configure --prefix="$BD_PREFIX" --bindir="$BD_BIN" && \
  make && \
  make install
  [ $? -ne 0 ] && \
    onFailure "failed to build YASM code"
  popd

  echo "== Building YASM $version ($(date)) [Completed] =="
  return 0
}

function buildFFmpeg() {
  local version="$VERSION"
  local package="$version.tar.gz"

  export PATH="$BD_BIN:$PATH"
  echo "== Building FFmpeg version $version ($(date)) =="

  curl -q -O -L https://github.com/FFmpeg/FFmpeg/archive/$package
  [ $? -ne 0 ] && \
    onFailure "failed to download FFmpeg code"

  tar xzf $package
  [ $? -ne 0 ] && \
    onFailure "failed to untar '$package'"

  pushd FFmpeg-$version
  PKG_CONFIG_PATH="$BD_PREFIX/lib/pkgconfig" ./configure \
    --prefix="$BD_PREFIX" \
    --extra-cflags="-I$BD_PREFIX/include -O2 -fstack-protector-strong -fpie -pie -Wl,-z,relro,-z,now -D_FORTIFY_SOURCE=2" \
    --extra-ldflags="-L$BD_LIB" \
    --extra-libs=-lpthread \
    --extra-libs=-lm \
    --bindir="$BD_BIN" \
    --enable-libfreetype \
    --enable-openssl \
    --enable-shared \
    --enable-pic \
    --disable-static \
    --disable-gpl \
    --disable-nonfree \
    --disable-version3 \
    --disable-debug \
    --disable-ffplay \
    --disable-libxcb \
    --disable-libxcb-shm \
    --disable-libxcb-xfixes \
    --disable-libxcb-shape \
    --disable-lzma \
    --disable-doc
  make && make install
  [ $? -ne 0 ] && \
    onFailure "error: failed to build FFmpeg version $version"
  popd

  echo "== Building FFmpeg version $version ($(date)) =="
  return 0
}

function createAndDeployFFmpegPackage() {
  local name="$DEPLOY_PKG_PREFIX-$VERSION.zip"
  local outFile="$ROOT_DIR/$name"
  local s3Key="$DEPLOY_PREFIX/$name"
  local s3Path="s3://$DEPLOY_BUCKET/$s3Key"

  echo "== Creating FFmpeg Lambda Layer Package ($(date)) =="

  mkdir dist && pushd dist
  # copy node skeleton package to dist
  cp -rv "$ROOT_DIR/nodejs" nodejs
  local modulesDir="nodejs/node_modules"
  local srcDir="$modulesDir/ffmpeg/src"
  local binDir="$modulesDir/ffmpeg/bin"
  local libDir="$modulesDir/ffmpeg/lib"
  mkdir -p $srcDir $binDir $libDir
  # copy ffmpeg source code
  local package="$VERSION.tar.gz"
  cp -v "$ROOT_DIR/$package" "$srcDir"
  # copy ffmpeg binaries and shared libraries
  cp -v $BD_BIN/ffmpeg "$binDir"
  cp -v $BD_BIN/ffprobe "$binDir"
  cp -av $BD_LIB/*.so*  "$libDir"
  # copy system libraries
  cp -av /lib64/libbz2.so* "$libDir"
  cp -av /lib64/libfreetype.so* "$libDir"
  cp -av /lib64/libpng*.so* "$libDir"

  # create zip package
  zip -r --symlinks "$outFile" .
  [ $? -ne 0 ] && \
    onFailure "failed to create ffmpeg layer package"
  popd

  echo "== Creating FFmpeg Lambda Layer Package ($(date)) [Completed] =="

  # deploy to S3 bucket
  echo "== Deploying FFmpeg Lambda Layer Package to '$s3Path' ($(date)) =="

  echo "Copying '$outFile' to '$s3Path'..."
  aws s3 cp "$outFile" "$s3Path"
  [ $? -ne 0 ] && \
    onFailure "failed to upload ffmpeg layer package to '$s3Path'"

  echo "== Deploying FFmpeg Lambda Layer Package ($(date)) [Completed] =="
  onCompleted "$DEPLOY_BUCKET" "$s3Key"
  return 0
}



###############################################################################
#
# Program Entry
#
###############################################################################
DEPLOY_DATETIME=$(date "+%Y%m%dT%H%M%S")
DEPLOY_PREFIX="codebuild/output/ffmpeg/$DEPLOY_DATETIME"
DEPLOY_PKG_PREFIX="layer-ffmpeg-lgpl2.1"
VERSION=
DEPLOY_BUCKET=
CLOUDFORMATION_URL=
ROOT_DIR="$(pwd)"
BD_PREFIX="$ROOT_DIR"
BD_BIN="$ROOT_DIR/bin"
BD_LIB="$ROOT_DIR/lib"

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
      -d|--deploy)
      DEPLOY_BUCKET="$2"
      shift # past key
      shift # past value
      ;;
      -v|--version)
      VERSION="$2"
      shift # past key
      shift # past value
      ;;
      -s|--signal)
      [ ! -z "$2" ] && \
      CLOUDFORMATION_URL=$(echo "$2" | base64 --decode) && \
      shift # past key
      shift # past value
      ;;
      *)
      shift
      ;;
  esac
done

checkCmdOptions
installDependencies
buildNASM
buildYASM
buildFFmpeg
createAndDeployFFmpegPackage
