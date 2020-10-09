// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
} = require('core-lib');

const StateJobCompleted = require('./states/job-completed');

exports.handler = async (event, context) => {
  let handler;
  try {
    if (event.state === States.JobCompleted) {
      handler = new StateJobCompleted(event, context);
    } else {
      throw new Error(`${event.state} not impl`);
    }
    return handler.process();
  } catch (e) {
    console.error(e);
    throw e;
  }
};
