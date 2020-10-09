// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const FS = require('fs');
const PATH = require('path');
const {
  States,
  mxBaseState,
  S3Utils,
} = require('core-lib');

const CONCURRENT_UPLOAD = 100;

class StateExtractKeyframes extends mxBaseState(class {}) {
  async process() {
    return this.extractKeyframes();
  }

  sanityCheck() {
    const src = this.input;
    if (!src) {
      throw new Error('missing input');
    }
    if (!src.bucket || !src.key || !src.projectName || !src.keyframesJson
      || src.startIndex === undefined || src.framesPerSlice === undefined) {
      throw new Error('missing bucket, key, projectName, keyframesJson, startIndex, and framesPerSlice');
    }
  }

  async extractKeyframes() {
    const src = this.input;
    const data = await S3Utils.getObject(src.bucket, src.keyframesJson)
      .then(x => JSON.parse(x.Body));
    const frames = data.frames.splice(src.startIndex, src.framesPerSlice);

    const FFmpegHelper = require('../shared/ffmpegHelper');
    const helper = new FFmpegHelper();
    const tmpDir = FFmpegHelper.mkTmpDir();
    try {
      const extracted = await helper.ffmpeg(src.bucket, src.key, frames, tmpDir);
      // upload key frames
      const subFolder = PATH.parse(src.key).name.replace(/[^a-zA-Z0-9_-]/g, '');
      const prefix = PATH.join(src.projectName, States.ExtractKeyframes, subFolder);
      let processed = 0;
      while (extracted.length) {
        const splices = extracted.splice(0, CONCURRENT_UPLOAD);
        await Promise.all(splices.map(x =>
          this.uploadKeyframe(src.bucket, prefix, x)));
        processed += splices.length;
      }
      FFmpegHelper.rmTmpDir(tmpDir);
      return processed;
    } catch (e) {
      console.log(`error: ${src.key}: ${e.message}`);
      throw e;
    } finally {
      FFmpegHelper.rmTmpDir(tmpDir);
    }
  }

  async uploadKeyframe(bucket, prefix, frame) {
    const name = `${frame.codedPictureNumber}.jpg`;
    const body = FS.readFileSync(frame.image);
    return S3Utils.getInstance().upload({
      Bucket: bucket,
      Key: PATH.join(prefix, name),
      Body: body,
      ContentType: 'image/jpeg',
      ContentDisposition: `attachment; filename="${name}"`,
    }).promise();
  }
}

module.exports = StateExtractKeyframes;
