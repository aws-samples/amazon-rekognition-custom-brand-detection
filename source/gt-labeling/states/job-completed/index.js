// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
  mxBaseState,
} = require('core-lib');

class StateJobCompleted extends mxBaseState(class {}) {
  constructor(event, context) {
    let modified = {};
    while (event.multiStateOutputs.length) {
      const stateOutput = event.multiStateOutputs.shift();
      if (stateOutput.ExecutionArn) {
        const output = JSON.parse(stateOutput.Output);
        modified.output = {
          ...modified.output,
          ...output.output,
        };
      } else {
        modified = {
          input: {
            ...modified.input,
            ...stateOutput.input,
          },
          output: {
            ...modified.output,
            ...stateOutput.output,
          },
        };
      }
    }
    super({
      ...modified,
      state: event.state,
    }, context);
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
