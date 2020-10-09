// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
} = require('core-lib');

const StateCreateProjectVersion = require('./states/create-project-version');
const StateCheckTrainingJob = require('./states/check-training-job');
const StateStartProjectVersion = require('./states/start-project-version');
const StateCheckModelStatus = require('./states/check-model-status');
const StateProjectVersionStarted = require('./states/project-version-started');

exports.handler = async (event, context) => {
  console.log(`event = ${JSON.stringify(event, null, 2)};\ncontext = ${JSON.stringify(context, null, 2)};`);
  let handler;
  try {
    if (event.state === States.CreateProjectVersion) {
      handler = new StateCreateProjectVersion(event, context);
    } else if (event.state === States.CheckTrainingJob) {
      handler = new StateCheckTrainingJob(event, context);
    } else if (event.state === States.StartProjectVersion) {
      handler = new StateStartProjectVersion(event, context);
    } else if (event.state === States.CheckModelStatus) {
      handler = new StateCheckModelStatus(event, context);
    } else if (event.state === States.ProjectVersionStarted) {
      handler = new StateProjectVersionStarted(event, context);
    } else {
      throw new Error(`${event.state} not impl`);
    }
    return handler.process();
  } catch (e) {
    console.error(e);
    throw e;
  }
};
