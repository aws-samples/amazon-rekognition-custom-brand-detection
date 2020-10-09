// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
  RekogHelper,
  mxBaseState,
} = require('core-lib');

const SECONDS_30 = 30;
const SECONDS_2MINS = 120;

class StateDetectCustomLabels extends mxBaseState(class {}) {
  constructor(event, context) {
    const stateOutput = JSON.parse(event.nestedStateOutput.Output);
    super({
      ...stateOutput,
      state: event.state,
    }, context);
  }

  async process() {
    const output = await this.detectCustomLabels();
    this.setOutput(States.DetectCustomLabels, output);
    return super.process();
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

  async detectCustomLabels() {
    const src = this.input;

    // adjust the model runtime.
    let ttl = this.output[States.ProjectVersionStarted].ttl;
    const t0 = Math.floor(new Date().getTime() / 1000);
    if (ttl - t0 < SECONDS_30) {
      await RekogHelper.updateProjectVersionTTL(src.projectVersionArn, t0 + SECONDS_2MINS);
      ttl = t0 + SECONDS_2MINS;
    }

    const params = this.makeParams();
    const response = await RekogHelper.detectCustomLabels(params);
    const prefix = this.makeOutputPath(src.key, States.DetectCustomLabels);
    const name = `${PATH.parse(src.key).name}.json`;
    await S3Utils.upload(src.bucket, PATH.join(prefix, name), response, {
      ContentType: 'application/json',
      ContentDisposition: `attachment; filename="${name}"`,
    });
    return {
      output: {
        bucket: src.bucket,
        key: PATH.join(prefix, name),
      },
    };
  }

  makeParams() {
    const src = this.input;
    return {
      Image: {
        S3Object: {
          Bucket: src.bucket,
          Name: src.key,
        },
      },
      ProjectVersionArn: src.projectVersionArn,
      MinConfidence: 50.0,
    };
  }
}

module.exports = StateDetectCustomLabels;
