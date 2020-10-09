// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
} = require('core-lib');
const BaseState = require('../shared/baseState');

class StateExtractKeyframesPostproc extends BaseState {
  async process() {
    const prevState = this.output[States.ExtractKeyframes];
    const totalFrames = prevState.iterators.reduce((a0, c0) => a0 + c0, 0);
    prevState.output.totalFrames = totalFrames;
    prevState.iterators = undefined;
    return super.process();
  }
}

module.exports = StateExtractKeyframesPostproc;
