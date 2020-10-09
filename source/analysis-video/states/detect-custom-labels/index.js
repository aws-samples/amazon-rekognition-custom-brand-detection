// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
  RekogHelper,
} = require('core-lib');
const BaseState = require('../shared/baseState');

const DETECT_CUSTOM_LABELS_TPS = 5;
const SECONDS_30 = 30;
const SECONDS_2MINS = 120;

class StateDetectCustomLabels extends BaseState {
  constructor(event, context) {
    const modified = (event.nestedStateOutput.ExecutionArn)
      ? {
        ...JSON.parse(event.nestedStateOutput.Output),
        state: event.state,
      }
      : {
        ...event.nestedStateOutput,
        state: event.state,
      };
    super(modified, context);
  }

  async process() {
    const output = await this.detectCustomLabels();
    this.setOutput(States.DetectCustomLabels, output);
    return super.process();
  }

  static get Status() {
    return {
      COMPLETED: 'completed',
      PROCESSING: 'processing',
    };
  }

  async detectCustomLabels() {
    const keyframesState = this.output[States.ExtractKeyframes].output;
    const curState = this.output[States.DetectCustomLabels] || {};
    const bucket = (curState.output || {}).bucket || keyframesState.bucket;
    const prefix = this.makeOutputPath(this.input.key, States.DetectCustomLabels);

    const data = await S3Utils.getObject(keyframesState.bucket, keyframesState.keyframesJson)
      .then(x => JSON.parse(x.Body.toString()));

    let cursor = (curState.cursor || 0);
    if (cursor > 0) {
      data.frames.splice(0, cursor);
    }

    const throughput = this.computeProjectVersionThroughput();
    let ttl = this.output[States.ProjectVersionStarted].ttl;
    while (data.frames.length && !this.quitNow()) {
      ttl = await this.updateProjectVersionTTL(ttl);
      const splices = data.frames.splice(0, throughput);
      const detections = await Promise.all(splices.map(x =>
        this.runDetection(keyframesState.bucket, keyframesState.prefix, x)));
      await this.batchCopyToS3(bucket, prefix, detections);
      cursor += splices.length;
    }

    return {
      status: data.frames.length > 0
        ? StateDetectCustomLabels.Status.PROCESSING
        : StateDetectCustomLabels.Status.COMPLETED,
      cursor,
      output: {
        bucket,
        prefix,
      },
    };
  }

  async runDetection(bucket, prefix, frame) {
    const src = this.input;
    const params = {
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: PATH.join(prefix, `${frame.coded_picture_number}.jpg`),
        },
      },
      ProjectVersionArn: src.projectVersionArn,
      MinConfidence: 50.0,
    };
    const response = await RekogHelper.detectCustomLabels(params);
    const timestamp = Math.round(Number.parseFloat(frame.best_effort_timestamp_time) * 1000);
    const smpteTimecode = ((frame.side_data_list || []).reduce((a0, c0) => ([
      ...a0,
      ...c0.timecodes,
    ]), [])[0] || {}).value;
    return {
      FrameNumber: frame.coded_picture_number,
      TimestampMillis: timestamp,
      TimecodeSMPTE: smpteTimecode,
      ...response,
    };
  }

  async batchCopyToS3(bucket, prefix, data) {
    return Promise.all(data.map((x) => {
      const name = `${x.FrameNumber}.json`;
      const options = {
        ContentType: 'application/json',
        ContentDisposition: `attachment; filename="${name}"`,
      };
      return S3Utils.upload(bucket, PATH.join(prefix, name), x, options);
    }));
  }

  async updateProjectVersionTTL(ttl) {
    const src = this.input;
    const t0 = Math.floor(new Date().getTime() / 1000);
    if ((ttl - t0) < SECONDS_30) {
      const newTTL = t0 + SECONDS_2MINS;
      await RekogHelper.updateProjectVersionTTL(src.projectVersionArn, newTTL);
      return newTTL;
    }
    return ttl;
  }

  computeProjectVersionThroughput() {
    const prevState = this.output[States.CheckModelStatus];
    return (prevState.inferenceUnits || 1) * DETECT_CUSTOM_LABELS_TPS;
  }
}

module.exports = StateDetectCustomLabels;
