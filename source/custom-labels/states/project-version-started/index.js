// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
  RekogHelper,
} = require('core-lib');
const BaseState = require('../shared/baseState');

const DEFAULT_TTL = 2 * 60; // 2 minutes
const DETECT_CUSTOM_LABELS_TPS = 5;
const FRAMES_PER_MIN_PER_INFERENCE = DETECT_CUSTOM_LABELS_TPS * 60;

class StateProjectVersionStarted extends BaseState {
  async process() {
    const output = await this.projectVersionStarted();
    this.setOutput(States.ProjectVersionStarted, output);
    return super.process();
  }

  sanityCheck() {
    const src = this.input;
    if (!src) {
      throw new Error('missing input');
    }
    if (!src.projectArn || !src.projectVersionArn) {
      throw new Error('missing projectArn and projectVersionArn');
    }
  }

  async projectVersionStarted() {
    let prevState = (this.output[States.ExtractKeyframes] || {}).output || {};
    const totalFrames = Math.max(prevState.totalFrames || 0, FRAMES_PER_MIN_PER_INFERENCE);

    prevState = this.output[States.CheckModelStatus];
    const inferenceUnits = prevState.inferenceUnits || 1;

    let seconds = totalFrames / (inferenceUnits * DETECT_CUSTOM_LABELS_TPS);
    seconds = Math.max(seconds, DEFAULT_TTL);

    const ttl = Math.floor(new Date().getTime() / 1000) + seconds;
    const src = this.input;
    await RekogHelper.updateProjectVersionTTL(src.projectVersionArn, ttl);
    return {
      ttl,
    };
  }
}

module.exports = StateProjectVersionStarted;
