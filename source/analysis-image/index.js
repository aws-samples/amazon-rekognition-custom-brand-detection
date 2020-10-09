// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
} = require('core-lib');

const StateDetectCustomLabels = require('./states/detect-custom-labels');

exports.handler = async (event, context) => {
  let handler;
  try {
    if (event.state === States.DetectCustomLabels) {
      handler = new StateDetectCustomLabels(event, context);
    } else {
      throw new Error(`${event.state} not impl`);
    }
    return handler.process();
  } catch (e) {
    console.error(e);
    throw e;
  }
};
