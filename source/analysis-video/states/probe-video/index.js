// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
} = require('core-lib');
const BaseState = require('../shared/baseState');

const FRAMES_PER_SLICE = 600;

class StateProbeVideo extends BaseState {
  async process() {
    const output = await this.probeVideo();
    this.setOutput(States.ExtractKeyframes, output);
    return super.process();
  }

  async probeVideo() {
    const src = this.input;
    const prefix = this.makeOutputPath(src.key, States.ExtractKeyframes);
    const name = 'keyframes.json';

    const FFmpegHelper = require('../shared/ffmpegHelper');
    const helper = new FFmpegHelper();
    const data = await helper.ffprobe(src.bucket, src.key);
    await S3Utils.upload(src.bucket, PATH.join(prefix, name), JSON.stringify(data, null, 2), {
      ContentType: 'application/json',
      ContentDisposition: `attachment; filename="${name}"`,
    });

    const iterators = [];
    const totalSlices = Math.ceil(data.frames.length / FRAMES_PER_SLICE);
    for (let i = 0; i < totalSlices; i++) {
      iterators.push({
        bucket: src.bucket,
        key: src.key,
        keyframesJson: PATH.join(prefix, name),
        startIndex: i * FRAMES_PER_SLICE,
        framesPerSlice: FRAMES_PER_SLICE,
      });
    }

    const duration = Number.parseInt(Number.parseFloat(data.streams[0].duration) * 1000, 10);
    return {
      output: {
        bucket: src.bucket,
        prefix,
        keyframesJson: PATH.join(prefix, name),
        streamInfo: {
          duration,
        },
      },
      iterators,
    };
  }
}

module.exports = StateProbeVideo;
