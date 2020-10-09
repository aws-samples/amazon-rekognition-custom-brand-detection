// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
} = require('core-lib');
const BaseAnnotations = require('./baseAnnotations');

class ClassificationAnnotations extends BaseAnnotations {
  async collectAnnotations() {
    const response = await this.describeLabelingJob();
    const labelingJobName = response.LabelingJobName;
    const attributeName = response.LabelAttributeName;

    const s3Uri = response.LabelingJobOutput.OutputDatasetS3Uri;
    let outputDataset = await this.getOutputDataset(s3Uri);
    /* Filter out PLACE_HOLDER label */
    outputDataset = outputDataset.filter(x =>
      x[`${attributeName}-metadata`]['class-name'] !== 'PLACE_HOLDER');

    const src = this.input;
    const prefix = PATH.join(src.projectName, States.CollectAnnotations);
    const name = 'consolidatedAnnotations.json';
    await S3Utils.upload(src.bucket, PATH.join(prefix, name), outputDataset, {
      ContentType: 'application/json',
      ContentDisposition: `attachment; filename="${name}"`,
    });

    return {
      output: {
        bucket: this.input.bucket,
        key: PATH.join(prefix, name),
        labelingJobName,
      },
    };
  }
}

module.exports = ClassificationAnnotations;
