// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
} = require('core-lib');
const SpriteHelper = require('../shared/spriteHelper');
const BaseState = require('../shared/baseState');

const PER_MIN_INTERVAL = 60 * 1000;

class StateCreateSpriteImagesPreproc extends BaseState {
  async process() {
    const output = await this.createSpriteImagesPre();
    this.setOutput(States.CreateSpriteImages, output);
    return super.process();
  }

  async createSpriteImagesPre() {
    const src = this.input;
    const prevState = this.output[States.ExtractKeyframes].output;
    const keyframesJson = PATH.join(prevState.prefix, 'keyframes.json');
    const data = await S3Utils.getObject(prevState.bucket, keyframesJson)
      .then(x => JSON.parse(x.Body));

    const [
      width,
      height,
      maxPerRow,
    ] = SpriteHelper.computeSpriteSize(data.streams[0].width, data.streams[0].height);

    let index = 0;
    let startIndex = 0;
    let framesPerSlice = 1;
    let stopTimestamp = PER_MIN_INTERVAL;
    const iterators = [];
    for (let i = 0; i < data.frames.length; i++) {
      const frame = data.frames[i];
      let timestamp = Number.parseFloat(frame.best_effort_timestamp_time);
      timestamp = Math.round(timestamp * 1000);
      if (timestamp <= stopTimestamp && i !== (data.frames.length - 1)) {
        framesPerSlice++;
      } else {
        iterators.push({
          bucket: src.bucket,
          key: src.key,
          index,
          startIndex,
          framesPerSlice,
        });
        index++;
        startIndex = i;
        framesPerSlice = 1;
        stopTimestamp = (iterators.length + 1) * PER_MIN_INTERVAL;
      }
    }

    return {
      iterators,
      output: {
        bucket: src.bucket,
        prefix: this.makeOutputPath(src.key, States.CreateSpriteImages),
        sprite: {
          width,
          height,
          maxPerRow,
        },
      },
    };
  }
}

module.exports = StateCreateSpriteImagesPreproc;
