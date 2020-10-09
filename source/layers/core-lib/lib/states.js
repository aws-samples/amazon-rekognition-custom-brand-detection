// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
module.exports = {
  ProbeVideoPreproc: 'probe-video-preproc',
  ProbeVideo: 'probe-video',
  ExtractKeyframesPreproc: 'extract-keyframes-preproc',
  ExtractKeyframes: 'extract-keyframes',
  ExtractKeyframesPostproc: 'extract-keyframes-postproc',
  PrepareLabelingJob: 'prepare-labeling-job',
  StartLabelingJob: 'start-labeling-job',
  CollectAnnotations: 'collect-annotations',
  // Custom Labels Traning Job states
  CreateProjectVersion: 'create-project-version',
  CheckTrainingJob: 'check-training-job',
  // Custom Labels Start Model states
  StartProjectVersion: 'start-project-version',
  CheckModelStatus: 'check-model-status',
  ProjectVersionStarted: 'project-version-started',
  // Analysis states
  DetectCustomLabels: 'detect-custom-labels',
  MapFramesShots: 'map-frames-shots',
  CreateSpriteImagesPreproc: 'create-sprite-images-preproc',
  CreateSpriteImages: 'create-sprite-images',
  JobCompleted: 'job-completed',
};
