// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const BoundingBoxLabelingJob = require('./lib/boundingBoxLabelingJob');
const ClassificationLabelingJob = require('./lib/classificationLabelingJob');

class StatePrepareLabelingJob {
  constructor(event, context) {
    this.$labelingJob = (event.input.trainingType === 'concept')
      ? new ClassificationLabelingJob(event, context)
      : new BoundingBoxLabelingJob(event, context);
  }

  async process() {
    return this.labelingJob.process();
  }

  get labelingJob() {
    return this.$labelingJob;
  }
}

module.exports = StatePrepareLabelingJob;
