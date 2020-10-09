// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  mxBaseState,
} = require('core-lib');

const FRAMES_PER_SLICE = 600;

class StateExtractKeyframesPreproc extends mxBaseState(class {}) {
  async process() {
    const output = await this.extractKeyframesPre();
    this.setOutput(States.ExtractKeyframes, output);
    return super.process();
  }

  async extractKeyframesPre() {
    const prevState = this.output[States.ProbeVideo];
    const iterators = [];
    while (prevState.iterators.length) {
      const iterator = prevState.iterators.shift();
      const totalSlices = Math.ceil(iterator.totalFrames / FRAMES_PER_SLICE);
      for (let i = 0; i < totalSlices; i++) {
        iterators.push({
          ...iterator,
          startIndex: i * FRAMES_PER_SLICE,
          framesPerSlice: FRAMES_PER_SLICE,
        });
      }
    }
    const src = this.input;
    const prefix = PATH.join(src.projectName, States.ExtractKeyframes);
    return {
      iterators,
      output: {
        bucket: src.bucket,
        prefix,
      },
    };
  }
}

module.exports = StateExtractKeyframesPreproc;
