// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const PATH = require('path');
const CRYPTO = require('crypto');
const {
  States,
  mxBaseState,
  ServiceToken,
} = require('core-lib');
const BuiltInTypes = require('./builtInTaskTypes');

const TASK_LIFETIME_IN_SECONDS = 24 * 3 * 3600;
const TASK_TIMEOUT_IN_SECONDS = 3 * 3600;

class StateStartLabelingJob extends mxBaseState(class {}) {
  async process() {
    const output = await this.startLabelingJob();
    this.setOutput(States.StartLabelingJob, output);
    await this.registerToken();
    return super.process();
  }

  async startLabelingJob() {
    const src = this.input;
    const id = CRYPTO.randomBytes(16).toString('hex');
    const prevState = this.output[States.PrepareLabelingJob].output;
    const labelingJobName = `${src.projectName}-${id}`;
    const params = (src.trainingType === 'concept')
      ? this.makeImageClassificationParams(labelingJobName, prevState)
      : this.makeVideoObjectDetectionParams(labelingJobName, prevState);

    const sagemaker = new AWS.SageMaker({
      apiVersion: '2017-07-24',
    });
    const response = await sagemaker.createLabelingJob(params).promise();

    return {
      jobId: response.LabelingJobArn,
    };
  }

  makeVideoObjectDetectionParams(labelingJobName, data) {
    const prefix = PATH.join(this.input.projectName, States.StartLabelingJob);
    const labelAttributeName = 'bounding-box-ref';
    const workteamArn = process.env.ENV_WORKTEAM_ARN;
    const labelWorkerRoleArn = process.env.ENV_LABELING_WORKER_ROLE_ARN;
    const manifestS3Uri = `s3://${data.bucket}/${data.datasetManifest.key}`;
    const s3OutputPath = `s3://${data.bucket}/${prefix}/`;
    const labelCategoryConfigS3Uri = `s3://${data.bucket}/${data.labelCategoryConfig.key}`;

    const annotationConsolidationLambdaArn =
      BuiltInTypes.AnnotationConsolidation.VideoObjectDetection[process.env.AWS_REGION];

    const preHumanTaskLambdaArn =
      BuiltInTypes.PreHumanTask.VideoObjectDetection[process.env.AWS_REGION];

    const humanTaskUiArn =
      BuiltInTypes.HumanTaskUi.VideoObjectDetection[process.env.AWS_REGION];

    const params = {
      HumanTaskConfig: {
        AnnotationConsolidationConfig: {
          AnnotationConsolidationLambdaArn: annotationConsolidationLambdaArn,
        },
        UiConfig: {
          HumanTaskUiArn: humanTaskUiArn,
        },
        NumberOfHumanWorkersPerDataObject: 1,
        PreHumanTaskLambdaArn: preHumanTaskLambdaArn,
        TaskDescription: 'Video frame object detection',
        // TODO: make sure the role also set the 'Maximum session duration'
        TaskTimeLimitInSeconds: TASK_TIMEOUT_IN_SECONDS,
        TaskTitle: 'Detect objects in video frames: Draw bounding box around the objects',
        WorkteamArn: workteamArn,
        MaxConcurrentTaskCount: 1000,
        TaskAvailabilityLifetimeInSeconds: TASK_LIFETIME_IN_SECONDS,
        TaskKeywords: [
          'video',
          'detection',
        ],
      },
      InputConfig: {
        DataSource: {
          S3DataSource: {
            ManifestS3Uri: manifestS3Uri,
          },
        },
        DataAttributes: {
          ContentClassifiers: [],
        },
      },
      LabelAttributeName: labelAttributeName,
      LabelingJobName: labelingJobName,
      OutputConfig: {
        S3OutputPath: s3OutputPath,
      },
      RoleArn: labelWorkerRoleArn,
      LabelCategoryConfigS3Uri: labelCategoryConfigS3Uri,
      StoppingConditions: {
        MaxPercentageOfInputDatasetLabeled: 100,
      },
      Tags: [],
    };
    return params;
  }

  makeImageClassificationParams(labelingJobName, data) {
    const prefix = PATH.join(this.input.projectName, States.StartLabelingJob);
    const labelAttributeName = 'image-classification';
    const workteamArn = process.env.ENV_WORKTEAM_ARN;
    const labelWorkerRoleArn = process.env.ENV_LABELING_WORKER_ROLE_ARN;
    const manifestS3Uri = `s3://${data.bucket}/${data.datasetManifest.key}`;
    const s3OutputPath = `s3://${data.bucket}/${prefix}/`;
    const labelCategoryConfigS3Uri = `s3://${data.bucket}/${data.labelCategoryConfig.key}`;

    const annotationConsolidationLambdaArn =
      BuiltInTypes.AnnotationConsolidation.ImageClassification[process.env.AWS_REGION];

    const preHumanTaskLambdaArn =
      BuiltInTypes.PreHumanTask.ImageClassification[process.env.AWS_REGION];

    const uiTemplateS3Uri = `s3://${data.bucket}/${data.uiTemplate.key}`;

    const params = {
      HumanTaskConfig: {
        AnnotationConsolidationConfig: {
          AnnotationConsolidationLambdaArn: annotationConsolidationLambdaArn,
        },
        UiConfig: {
          UiTemplateS3Uri: uiTemplateS3Uri,
        },
        NumberOfHumanWorkersPerDataObject: 1,
        PreHumanTaskLambdaArn: preHumanTaskLambdaArn,
        TaskDescription: 'Categorize images into specific classes',
        // TODO: make sure the role also set the 'Maximum session duration'
        TaskTimeLimitInSeconds: TASK_TIMEOUT_IN_SECONDS,
        TaskTitle: 'Single Label Image Classification: Select a label best represents the images',
        WorkteamArn: workteamArn,
        MaxConcurrentTaskCount: 1000,
        TaskAvailabilityLifetimeInSeconds: TASK_LIFETIME_IN_SECONDS,
        TaskKeywords: [
          'images',
          'categorization',
          'classification',
        ],
      },
      InputConfig: {
        DataSource: {
          S3DataSource: {
            ManifestS3Uri: manifestS3Uri,
          },
        },
        DataAttributes: {
          ContentClassifiers: [],
        },
      },
      LabelAttributeName: labelAttributeName,
      LabelingJobName: labelingJobName,
      OutputConfig: {
        S3OutputPath: s3OutputPath,
      },
      RoleArn: labelWorkerRoleArn,
      LabelCategoryConfigS3Uri: labelCategoryConfigS3Uri,
      StoppingConditions: {
        MaxPercentageOfInputDatasetLabeled: 100,
      },
      Tags: [],
    };
    return params;
  }

  async registerToken() {
    return ServiceToken.register(
      this.output[States.StartLabelingJob].jobId,
      this.event.token,
      'sagemaker',
      States.StartLabelingJob,
      this.toJSON(),
      4 // 4 days
    );
  }
}

module.exports = StateStartLabelingJob;
