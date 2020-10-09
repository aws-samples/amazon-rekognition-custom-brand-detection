// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
  mxBaseState,
} = require('core-lib');

class StateJobCompleted extends mxBaseState(class {}) {
  constructor(event, context) {
    const stateOutput = JSON.parse(event.nestedStateOutput.Output);
    super({
      ...stateOutput,
      state: event.state,
    }, context);
  }

  sanityCheck() {
    const src = this.input;
    if (!src) {
      throw new Error('missing input');
    }
    if (!src.bucket || !src.key || !src.projectArn || !src.projectVersionArn) {
      throw new Error('missing bucket, key, projectArn, and projectVersionArn');
    }
  }

  async process() {
    const output = await this.jobCompleted();
    this.setOutput(States.JobCompleted, output);
    return super.process();
  }

  async jobCompleted() {
    return undefined;
  }
}

module.exports = StateJobCompleted;
