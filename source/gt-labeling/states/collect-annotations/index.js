// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
  mxBaseState,
} = require('core-lib');
const ClassificationAnnotations = require('./lib/classificationAnnotations');
const BoundingBoxAnnotations = require('./lib/boundingBoxAnnotations');

class StateCollectAnnotations {
  constructor(event, context) {
    this.$annotator = (event.input.trainingType === 'concept')
      ? new ClassificationAnnotations(event, context)
      : new BoundingBoxAnnotations(event, context);
  }

  get annotator() {
    return this.$annotator;
  }

  async process() {
    return this.annotator.process();
  }
}

module.exports = StateCollectAnnotations;
