// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
  RekogHelper,
} = require('core-lib');
const BaseState = require('../shared/baseState');

class StateCheckTrainingJob extends BaseState {
  async process() {
    const output = await this.checkTrainingJob();
    this.setOutput(States.CheckTrainingJob, output);
    return super.process();
  }

  async checkTrainingJob() {
    const prevState = this.output[States.CreateProjectVersion].output;
    return RekogHelper.describeProjectVersion(prevState.projectArn, prevState.projectVersionArn);
  }
}

module.exports = StateCheckTrainingJob;
