// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const {
  States,
  ServiceToken,
} = require('core-lib');

class LabelingJobStatus {
  constructor(parent) {
    this.$parent = parent;
    this.$service = undefined;
    this.$api = undefined;
  }

  static get SourceType() {
    return 'aws.sagemaker';
  }

  static get Mapping() {
    return {
      Completed: 'completed',
      Stopped: 'error',
      Failed: 'error',
    };
  }

  static get Event() {
    return {
      Completed: 'Completed',
      Failed: 'Failed',
      Stopped: 'Stopped',
    };
  }

  get parent() {
    return this.$parent;
  }

  get api() {
    return this.$api;
  }

  set api(val) {
    this.$api = val;
  }

  get service() {
    return this.$service;
  }

  set service(val) {
    this.$service = val;
  }

  get event() {
    return this.parent.event;
  }

  get context() {
    return this.parent.context;
  }

  get detail() {
    return this.parent.detail;
  }

  get resources() {
    return this.parent.resources;
  }

  get token() {
    return this.parent.token;
  }

  set token(val) {
    this.parent.token = val;
  }

  get stateData() {
    return this.parent.stateData;
  }

  set stateData(val) {
    this.parent.stateData = val;
  }

  async process() {
    const jobId = this.resources[0];
    const status = this.detail.LabelingJobStatus;
    const response = await ServiceToken.getData(jobId).catch(() => undefined);
    if (!response || !response.service || !response.token || !response.api) {
      throw new Error(`fail to get token, ${jobId}`);
    }

    this.token = response.token;
    this.service = response.service;
    this.api = response.api;
    this.stateData = JSON.parse(JSON.stringify(response.data));

    switch (status) {
      case LabelingJobStatus.Event.Completed:
        await this.onCompleted();
        break;
      case LabelingJobStatus.Event.Failed:
      case LabelingJobStatus.Event.Stopped:
      default:
        await this.onError();
        break;
    }
    await ServiceToken.unregister(jobId).catch(() => undefined);
    return response.data;
  }

  async onCompleted() {
    const data = this.stateData.output[States.StartLabelingJob];
    data.status = LabelingJobStatus.Mapping[LabelingJobStatus.Event.Completed];
    data.metrics.t1 = new Date().getTime();
    return this.parent.sendTaskSuccess();
  }

  async onError() {
    const response = await this.describeLabelingJob();
    const error = response.LabelingJobStatus === LabelingJobStatus.Event.Stopped
      ? new Error('stopped by user')
      : new Error(response.FailureReason);
    const data = this.stateData.output[States.StartLabelingJob];
    data.status = LabelingJobStatus.Mapping[response.LabelingJobStatus] || 'error';
    data.errorMessage = error.message;
    data.metrics.t1 = new Date().getTime();
    return this.parent.sendTaskFailure(error);
  }

  async describeLabelingJob() {
    const labelingJobName = this.resources[0].split('/').pop();
    const sagemaker = new AWS.SageMaker({
      apiVersion: '2017-07-24',
    });
    return sagemaker.describeLabelingJob({
      LabelingJobName: labelingJobName,
    }).promise();
  }
}

module.exports = LabelingJobStatus;
