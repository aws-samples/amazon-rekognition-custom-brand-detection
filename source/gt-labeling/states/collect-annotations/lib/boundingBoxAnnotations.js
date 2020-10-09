// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
} = require('core-lib');
const BaseAnnotations = require('./baseAnnotations');

class BoundingBoxAnnotations extends BaseAnnotations {
  async collectAnnotations() {
    const canvasLib = require('canvas');
    const response = await this.describeLabelingJob();
    const labelingJobName = response.LabelingJobName;
    const attributeName = response.LabelAttributeName;

    const s3Uri = response.LabelingJobOutput.OutputDatasetS3Uri;
    const outputDataset = await this.getOutputDataset(s3Uri);

    const labelingType = 'video-object-detection_BB';
    let annotations = await Promise.all(outputDataset.map(dataset =>
      this.parseAnnotation(canvasLib, labelingType, attributeName, dataset)));
    annotations = annotations.reduce((a0, c0) => a0.concat(c0), []);
    // filter source-ref that is without annotations
    annotations = annotations.filter(x =>
      x[labelingType].annotations.length > 0);

    const src = this.input;
    const prefix = PATH.join(src.projectName, States.CollectAnnotations);
    const name = 'consolidatedAnnotations.json';
    await S3Utils.upload(src.bucket, PATH.join(prefix, name), annotations, {
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

  async parseAnnotation(canvasLib, labelingType, attributeName, dataset) {
    // get frame's location
    let tmp = dataset['source-ref'].slice('s3://'.length).split('/');
    let bucket = tmp.shift();
    let key = tmp.join('/');

    const frameSequence = await S3Utils.getObject(bucket, key)
      .then(data => JSON.parse(data.Body));
    tmp = frameSequence.prefix.slice('s3://'.length).split('/');
    frameSequence.bucket = tmp.shift();
    frameSequence.prefix = tmp.join('/');

    // get frame size
    key = PATH.join(frameSequence.prefix, 'keyframes.json');
    const [
      width,
      height,
    ] = await this.getFrameWxH(frameSequence.bucket, key);

    // get consolidated annotation results
    tmp = dataset[attributeName].slice('s3://'.length).split('/');
    bucket = tmp.shift();
    key = tmp.join('/');

    const metadata = dataset[`${attributeName}-metadata`];
    const annotations = await S3Utils.getObject(bucket, key)
      .then(data => JSON.parse(data.Body));

    const annotationResults = [];
    const date = new Date().toISOString();
    while (annotations['detection-annotations'].length) {
      const perFrameAnnotation = annotations['detection-annotations'].shift();
      const sourceRef = `s3://${frameSequence.bucket}/${PATH.join(frameSequence.prefix, perFrameAnnotation.frame)}`;
      let actualW;
      let actualH;
      if (!width || !height) {
        [
          actualW,
          actualH,
        ] = await this.readImageWxH(
          canvasLib,
          frameSequence.bucket,
          PATH.join(frameSequence.prefix, perFrameAnnotation.frame)
        );
      } else {
        actualW = width;
        actualH = height;
      }

      const boundingBox = {
        image_size: [
          {
            width: actualW,
            height: actualH,
            depth: 3,
          },
        ],
        annotations: [],
      };
      const labelingTypeMetadata = {
        objects: [],
        type: 'groundtruth/object-detection',
        'class-map': metadata['class-map'],
        'human-annotated': 'yes',
        'creation-date': date,
        'job-name': `labeling-job/${labelingType}`,
      };

      while (perFrameAnnotation.annotations.length) {
        const annotation = perFrameAnnotation.annotations.shift();
        boundingBox.annotations.push({
          class_id: Number.parseInt(annotation['class-id'], 10),
          top: annotation.top,
          left: annotation.left,
          width: annotation.width,
          height: annotation.height,
        });
        labelingTypeMetadata.objects.push({
          confidence: 1,
        });
      }

      annotationResults.push({
        'source-ref': sourceRef,
        [labelingType]: boundingBox,
        [`${labelingType}-metadata`]: labelingTypeMetadata,
      });
    }
    return annotationResults;
  }

  async getFrameWxH(bucket, key) {
    const keyframes = await S3Utils.getObject(bucket, key)
      .then(data => JSON.parse(data.Body))
      .catch(() => undefined);
    return (!keyframes)
      ? []
      : [
        keyframes.streams[0].width,
        keyframes.streams[0].height,
      ];
  }

  async readImageWxH(canvasLib, bucket, key) {
    const url = S3Utils.signUrl(bucket, key);
    const img = await canvasLib.loadImage(url);
    return [
      img.width,
      img.height,
    ];
  }
}

module.exports = BoundingBoxAnnotations;
