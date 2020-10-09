// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
} = require('core-lib');
const BaseState = require('../shared/baseState');

const PER_MIN_INTERVAL = 60 * 1000;

class StateMapFramesShots extends BaseState {
  constructor(event, context) {
    let modified = {};
    while (event.multiStateOutputs.length) {
      const stateOutput = event.multiStateOutputs.shift();
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
    modified.state = event.state;
    super(modified, context);
    this.output[States.CreateSpriteImages].iterators = undefined;
  }

  async process() {
    const output = await this.mapFramesShots();
    this.setOutput(States.MapFramesShots, output);
    return super.process();
  }

  async mapFramesShots() {
    const frames = await this.getExtractKeyframes();
    const mappings = [];
    let minIndex = 0;
    while (frames.length) {
      // get frames for the minute
      const startTimestamp = minIndex * PER_MIN_INTERVAL;
      const stopTimestamp = (minIndex + 1) * PER_MIN_INTERVAL;
      const frameIndices = [];
      const customLabels = {};
      let timestamp;
      while (frames.length) {
        const frame = frames.shift();
        timestamp = Number.parseFloat(frame.best_effort_timestamp_time);
        timestamp = Math.round(timestamp * 1000);
        if (timestamp < startTimestamp) {
          continue;
        }
        if (timestamp > stopTimestamp) {
          frames.unshift(frame);
          break;
        }
        frameIndices.push(frame.coded_picture_number);
        const detectedLabels = await this.getCustomLabels(frame.coded_picture_number);
        detectedLabels.forEach((label) => {
          if (!customLabels[label]) {
            customLabels[label] = [];
          }
          if (customLabels[label].indexOf(frame.coded_picture_number) < 0) {
            customLabels[label].push(frame.coded_picture_number);
          }
        });
      }
      mappings.push({
        minIndex,
        startTime: startTimestamp,
        endTime: frames.length
          ? stopTimestamp
          : timestamp,
        frames: frameIndices,
        customLabels,
      });
      minIndex++;
    }

    const prevState = this.output[States.DetectCustomLabels].output;
    const prefix = this.makeOutputPath(this.input.key, States.MapFramesShots);
    const name = 'mapFramesShots.json';
    await S3Utils.upload(prevState.bucket, PATH.join(prefix, name), mappings, {
      ContentType: 'application/json',
      ContentDisposition: `attachment; filename="${name}"`,
    });

    return {
      output: {
        bucket: prevState.bucket,
        key: PATH.join(prefix, name),
      },
    };
  }

  async getExtractKeyframes() {
    const prevState = this.output[States.ExtractKeyframes].output;
    return S3Utils.getObject(prevState.bucket, prevState.keyframesJson)
      .then(data => JSON.parse(data.Body).frames);
  }

  async getCustomLabels(frameNum) {
    const prevState = this.output[States.DetectCustomLabels].output;
    const key = PATH.join(prevState.prefix, `${frameNum}.json`);
    return S3Utils.getObject(prevState.bucket, key)
      .then(data =>
        JSON.parse(data.Body)
          .CustomLabels.map(x => x.Name));
  }
}

module.exports = StateMapFramesShots;
