// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
  RekogHelper,
} = require('core-lib');
const BaseState = require('../shared/baseState');

class StateCheckModelStatus extends BaseState {
  async process() {
    const output = await this.checkModelStatus();
    this.setOutput(States.CheckModelStatus, output);
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

  async checkModelStatus() {
    const src = this.input;
    return RekogHelper.describeProjectVersion(src.projectArn, src.projectVersionArn);
  }
}

module.exports = StateCheckModelStatus;
