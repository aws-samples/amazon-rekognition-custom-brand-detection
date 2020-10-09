// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  Mime,
  States,
  mxBaseState,
} = require('core-lib');

class StateProbeVideoPreproc extends mxBaseState(class {}) {
  async process() {
    const output = await this.probeVideoPreproc();
    this.setOutput(States.ProbeVideo, output);
    return super.process();
  }

  async probeVideoPreproc() {
    const src = this.input;
    const videos = src.keys.filter((x) => {
      const mime = Mime.getType(x) || '';
      return (mime.split('/').shift() !== 'image');
    });
    return {
      iterators: videos.map(x => ({
        projectName: src.projectName,
        bucket: src.bucket,
        key: x,
      })),
      output: {
        bucket: src.bucket,
        prefix: PATH.join(src.projectName, States.ExtractKeyframes),
      },
    };
  }
}

module.exports = StateProbeVideoPreproc;
