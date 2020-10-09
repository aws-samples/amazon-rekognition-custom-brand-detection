// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const FS = require('fs');
const {
  States,
  S3Utils,
} = require('core-lib');
const BaseLabelingJob = require('./baseLabelingJob');

class ClassificationLabelingJob extends BaseLabelingJob {
  async createDatasetManifest(frameSequences) {
    const src = this.input;

    const responses = await Promise.all(frameSequences.keys.map(key =>
      S3Utils.getObject(frameSequences.bucket, key)
        .then(data => JSON.parse(data.Body))));
    const sourceRefs = [];
    while (responses.length) {
      const response = responses.shift();
      while (response.frames.length) {
        const frame = response.frames.shift();
        sourceRefs.push(JSON.stringify({
          'source-ref': `${response.prefix}${frame.frame}`,
        }));
      }
    }

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

    /* make sure we have at least 2 labels for image classification template */
    const labels = src.labels.slice();
    if (labels.length < 2) {
      labels.push('PLACE_HOLDER');
    }

    const labelCategoryConfig = {
      'document-version': '2018-11-28',
      labels: labels.map(x => ({
        label: x,
      })),
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

  async createUITemplate(labelCategoryConfig) {
    const src = this.input;
    const uiTemplate = FS.readFileSync(PATH.join(__dirname, '../template/imageClassification.liquid'));

    const prefix = PATH.join(src.projectName, States.PrepareLabelingJob);
    const name = 'imageClassificationTemplate.liquid';
    await S3Utils.getInstance().putObject({
      Bucket: labelCategoryConfig.bucket,
      Key: PATH.join(prefix, name),
      ContentType: 'application/octet-stream',
      ServerSideEncryption: 'AES256',
      Body: uiTemplate,
    }).promise();

    return {
      bucket: labelCategoryConfig.bucket,
      key: PATH.join(prefix, name),
    };
  }
}

module.exports = ClassificationLabelingJob;
