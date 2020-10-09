// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
  RekogHelper,
} = require('core-lib');
const BaseState = require('../shared/baseState');

class StateStartProjectVersion extends BaseState {
  async process() {
    const output = await this.startProjectVersion();
    this.setOutput(States.StartProjectVersion, output);
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

  async startProjectVersion() {
    return RekogHelper.startProjectVersion({
      MinInferenceUnits: this.input.inferenceUnits || 1,
      ProjectVersionArn: this.input.projectVersionArn,
    }).then(data => ({
      status: data.Status,
    }));
  }
}

module.exports = StateStartProjectVersion;
