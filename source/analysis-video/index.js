// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  States,
} = require('core-lib');

const StateProbeVideo = require('./states/probe-video');
const StateExtractKeyframes = require('./states/extract-keyframes');
const StateExtractKeyframesPostproc = require('./states/extract-keyframes-postproc');
const StateDetectCustomLabels = require('./states/detect-custom-labels');
const StateMapFramesShots = require('./states/map-frames-shots');
const StateCreateSpriteImagesPreproc = require('./states/create-sprite-images-preproc');
const StateCreateSpriteImages = require('./states/create-sprite-images');

exports.handler = async (event, context) => {
  let handler;
  try {
    if (event.state === States.ProbeVideo) {
      handler = new StateProbeVideo(event, context);
    } else if (event.state === States.ExtractKeyframes) {
      handler = new StateExtractKeyframes(event, context);
    } else if (event.state === States.ExtractKeyframesPostproc) {
      handler = new StateExtractKeyframesPostproc(event, context);
    } else if (event.state === States.DetectCustomLabels) {
      handler = new StateDetectCustomLabels(event, context);
    } else if (event.state === States.MapFramesShots) {
      handler = new StateMapFramesShots(event, context);
    } else if (event.state === States.CreateSpriteImagesPreproc) {
      handler = new StateCreateSpriteImagesPreproc(event, context);
    } else if (event.state === States.CreateSpriteImages) {
      handler = new StateCreateSpriteImages(event, context);
    } else {
      throw new Error(`${event.state} not impl`);
    }
    return handler.process();
  } catch (e) {
    console.error(e);
    throw e;
  }
};
