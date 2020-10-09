// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  mxBaseState,
  Mime,
  S3Utils,
} = require('core-lib');

class BaseLabelingJob extends mxBaseState(class {}) {
  async process() {
    const output = await this.prepareLabelingJob();
    this.setOutput(States.PrepareLabelingJob, output);
    return super.process();
  }

  async prepareLabelingJob() {
    const frameSequences = await this.createFrameSequenceJson();
    const datasetManifest = await this.createDatasetManifest(frameSequences);
    const labelCategoryConfig = await this.createLabelCategoryConfigJson(datasetManifest);
    const uiTemplate = await this.createUITemplate(labelCategoryConfig);
    return {
      output: {
        bucket: frameSequences.bucket,
        frameSequences: {
          keys: frameSequences.keys,
        },
        datasetManifest: {
          key: datasetManifest.key,
        },
        labelCategoryConfig: {
          key: labelCategoryConfig.key,
        },
        uiTemplate: {
          key: (uiTemplate || {}).key,
        },
      },
    };
  }

  async createFrameSequenceJson() {
    const src = this.input;

    // sort based on file types
    const images = [];
    const videos = [];
    src.keys.forEach((key) => {
      const mime = Mime.getType(key) || '';
      if (mime.split('/').shift() === 'image') {
        images.push(key);
      } else {
        videos.push(key);
      }
    });

    const promises = [];
    let seqNumber = 1;
    if (images.length) {
      promises.push(this.createImageBasedFrameSequenceJson(images, seqNumber));
      seqNumber++;
    }
    if (videos.length) {
      promises.push(this.createVideoBasedFrameSequenceJson(videos, seqNumber));
    }

    const prevState = this.output[States.ExtractKeyframes].output;
    const keys = await Promise.all(promises).then(data =>
      data.reduce((a0, c0) => a0.concat(c0), []));
    return {
      bucket: prevState.bucket,
      keys,
    };
  }

  async createImageBasedFrameSequenceJson(images, startSeqNum) {
    const src = this.input;
    const prevState = this.output[States.ExtractKeyframes].output;

    const frameSequence = {
      'seq-no': startSeqNum,
      prefix: `s3://${prevState.bucket}/`,
      frames: [],
    };
    let frameIndex = 0;
    while (images.length) {
      const image = images.shift();
      frameSequence.frames.push({
        'frame-no': frameIndex++,
        frame: image,
      });
    }
    frameSequence['number-of-frames'] = frameSequence.frames.length;

    const subFolder = 'assorted-images';
    const key = PATH.join(src.projectName, States.PrepareLabelingJob, subFolder, `frameSequence-${startSeqNum}.json`);
    const s3 = S3Utils.getInstance();
    await s3.putObject({
      Bucket: prevState.bucket,
      Key: key,
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
      Body: JSON.stringify(frameSequence, null, 2),
    }).promise();

    return [key];
  }

  async createVideoBasedFrameSequenceJson(videos, startSeqNum) {
    const src = this.input;
    const prevState = this.output[States.ExtractKeyframes].output;

    const keys = [];
    let seqNumber = startSeqNum;
    const subFolders = videos.map(x => PATH.parse(x).name.replace(/[^a-zA-Z0-9_-]/g, ''));
    while (subFolders.length) {
      const subFolder = subFolders.shift();
      const prefix = PATH.join(prevState.prefix, subFolder);
      const name = 'keyframes.json';
      const keyframes = await S3Utils.getObject(prevState.bucket, PATH.join(prefix, name))
        .then(data => JSON.parse(data.Body));

      const frameSequence = {
        'seq-no': seqNumber,
        prefix: `s3://${prevState.bucket}/${prefix}/`,
        frames: [],
      };

      let frameIndex = 0;
      while (keyframes.frames.length) {
        const frame = keyframes.frames.shift();
        frameSequence.frames.push({
          'frame-no': frameIndex++,
          frame: `${frame.coded_picture_number}.jpg`,
        });
      }
      frameSequence['number-of-frames'] = frameSequence.frames.length;

      const key = PATH.join(src.projectName, States.PrepareLabelingJob, subFolder, `frameSequence-${seqNumber++}.json`);
      const s3 = S3Utils.getInstance();
      await s3.putObject({
        Bucket: prevState.bucket,
        Key: key,
        ContentType: 'application/json',
        ServerSideEncryption: 'AES256',
        Body: JSON.stringify(frameSequence, null, 2),
      }).promise();
      keys.push(key);
    }
    return keys;
  }

  async createDatasetManifest(frameSequences) {
    throw new Error('subclass to implement');
  }

  async createLabelCategoryConfigJson(datasetManifest) {
    throw new Error('subclass to implement');
  }

  async createUITemplate(labelCategoryConfig) {
    return undefined;
  }
}

module.exports = BaseLabelingJob;
