// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  mxBaseState,
  S3Utils,
} = require('core-lib');

class StateProbeVideo extends mxBaseState(class {}) {
  async process() {
    return this.probeVideo();
  }

  sanityCheck() {
    const src = this.input;
    if (!src) {
      throw new Error('missing input');
    }
    if (!src.bucket || !src.key || !src.projectName) {
      throw new Error('missing bucket, key or projectName');
    }
  }

  async probeVideo() {
    const src = this.input;
    const subFolder = PATH.parse(src.key).name.replace(/[^a-zA-Z0-9_-]/g, '');
    const prefix = PATH.join(src.projectName, States.ExtractKeyframes, subFolder);
    const name = 'keyframes.json';

    const FFmpegHelper = require('../shared/ffmpegHelper');
    const helper = new FFmpegHelper();
    const data = await helper.ffprobe(src.bucket, src.key);
    // Amazon SageMaker Ground Truth supports at most 2,000 frames per video
    // https://docs.aws.amazon.com/sagemaker/latest/dg/sms-video-automated-data-setup.html
    data.frames = data.frames.splice(0, 2000);
    await S3Utils.upload(src.bucket, PATH.join(prefix, name), JSON.stringify(data, null, 2), {
      ContentType: 'application/json',
      ContentDisposition: `attachment; filename="${name}"`,
    });

    return {
      ...this.input,
      keyframesJson: PATH.join(prefix, name),
      totalFrames: data.frames.length,
    };
  }
}

module.exports = StateProbeVideo;
