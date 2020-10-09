// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
} = require('core-lib');

const StateProbeVideoPreproc = require('./states/probe-video-preproc');
const StateProbeVideo = require('./states/probe-video');
const StateExtractKeyframesPreproc = require('./states/extract-keyframes-preproc');
const StateExtractKeyframes = require('./states/extract-keyframes');
const StatePrepareLabelingJob = require('./states/prepare-labeling-job');
const StateStartLabelingJob = require('./states/start-labeling-job');
const StateCollectAnnotations = require('./states/collect-annotations');
const StateJobCompleted = require('./states/job-completed');

exports.handler = async (event, context) => {
  console.log(`event = ${JSON.stringify(event, null, 2)};\ncontext = ${JSON.stringify(context, null, 2)};`);
  let handler;
  try {
    if (event.state === States.ProbeVideoPreproc) {
      handler = new StateProbeVideoPreproc(event, context);
    } else if (event.state === States.ProbeVideo) {
      handler = new StateProbeVideo(event, context);
    } else if (event.state === States.ExtractKeyframesPreproc) {
      handler = new StateExtractKeyframesPreproc(event, context);
    } else if (event.state === States.ExtractKeyframes) {
      handler = new StateExtractKeyframes(event, context);
    } else if (event.state === States.PrepareLabelingJob) {
      handler = new StatePrepareLabelingJob(event, context);
    } else if (event.state === States.StartLabelingJob) {
      handler = new StateStartLabelingJob(event, context);
    } else if (event.state === States.CollectAnnotations) {
      handler = new StateCollectAnnotations(event, context);
    } else if (event.state === States.JobCompleted) {
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
