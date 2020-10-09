// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
} = require('core-lib');

const BaseLabelingJob = require('./baseLabelingJob');

class BoundingBoxLabelingJob extends BaseLabelingJob {
  async createDatasetManifest(frameSequences) {
    const src = this.input;
    const sourceRefs = frameSequences.keys.map(key =>
      JSON.stringify({
        'source-ref': `s3://${frameSequences.bucket}/${key}`,
      }));

    const prefix = PATH.join(src.projectName, States.PrepareLabelingJob);
    const name = 'dataset.manifest';
    await S3Utils.getInstance().putObject({
      Bucket: frameSequences.bucket,
      Key: PATH.join(prefix, name),
      ContentType: 'application/octet-stream',
      ServerSideEncryption: 'AES256',
      Body: sourceRefs.join('\n'),
    }).promise();

    return {
      bucket: frameSequences.bucket,
      key: PATH.join(prefix, name),
    };
  }

  async createLabelCategoryConfigJson(datasetManifest) {
    const src = this.input;
    const prefix = PATH.join(src.projectName, States.PrepareLabelingJob);
    const name = 'labelCategoryConfig.json';

    const labelCategoryConfig = {
      'document-version': '2020-03-01',
      labels: src.labels.map(x => ({
        label: x,
      })),
      categoryGlobalAttributes: [],
      instructions: {
        shortInstruction: `Draw bounding box around ${src.labels.join(', ')} objects.`,
        fullInstruction: '<ul><li>Use the navigation bar in the bottom-left corner to see all video frames included in this task. Label each frame.&nbsp;</li><li>Each time the same object or person appears in multiple frames, it is called an <em>instance</em> of that object or person. Use the predict next icon <img src=\"https://dfgej61ul7ygg.cloudfront.net/942cc0c8-4d4c-4986-9b21-685d79704e6d/src/images/PredictNext.svg\" style=\"max-width:100%\">, or the shortcut command <strong>P</strong>, to have the user interface automatically infer the location of bounding boxes in subsequent frames for instances of objects and people once you’ve placed a single bounding box around an object or person. Adjust the location and dimensions these inferred boxes as needed.&nbsp;</li><li>After you add a bounding box, adjust the box to fit tightly around the boundaries of an object or a person.</li><li>Once you add a bounding box, select the associated label in the <strong>Labels</strong> menu to add label attributes, if applicable.&nbsp;</li><li>Use the <strong>Shortcuts</strong> menu to see keyboard shortcuts that you can use to label objects faster.</li><li>Use this <a href=\"https://docs.aws.amazon.com/sagemaker/latest/dg/sms-video-object-detection.html#sms-video-od-worker-ui\" rel=\"noopener noreferrer\" target=\"_blank\" style=\"color: rgb(68, 185, 214);\">resource</a> to learn about worker portal navigation, tools available to complete your task, icons, and view options.</li></ul>', // eslint-disable-line
      },
    };

    await S3Utils.getInstance().putObject({
      Bucket: datasetManifest.bucket,
      Key: PATH.join(prefix, name),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
      Body: JSON.stringify(labelCategoryConfig, null, 2),
    }).promise();

    return {
      bucket: datasetManifest.bucket,
      key: PATH.join(prefix, name),
    };
  }
}

module.exports = BoundingBoxLabelingJob;
