// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const {
  States,
  S3Utils,
} = require('core-lib');
const SpriteHelper = require('../shared/spriteHelper');
const BaseState = require('../shared/baseState');

class StateCreateSpriteImages extends BaseState {
  async process() {
    return this.createSpriteImages();
  }

  sanityCheck() {
    const src = this.input;
    if (!src) {
      throw new Error('missing input');
    }

    const missing = [
      'bucket',
      'key',
      'index',
      'startIndex',
      'framesPerSlice',
    ].filter(x => src[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }
  }

  async createSpriteImages() {
    const src = this.input;

    let prefix = this.makeOutputPath(src.key, States.ExtractKeyframes);
    const keyframesJson = PATH.join(prefix, 'keyframes.json');
    const data = await this.getExtractKeyframes(src.bucket, keyframesJson);
    const [
      spriteW,
      spriteH,
      maxPerRow,
    ] = SpriteHelper.computeSpriteSize(data.streams[0].width, data.streams[0].height);

    const canvasLib = require('canvas');
    const [
      canvas,
      context,
    ] = this.createSpriteCanvas(canvasLib, data.frames.length, spriteW, spriteH, maxPerRow);

    let rowIdx = 0;
    while (data.frames.length) {
      const splices = data.frames.splice(0, 20);
      for (let colIdx = 0; colIdx < splices.length; colIdx++) {
        const frame = splices[colIdx];
        const key = PATH.join(prefix, `${frame.coded_picture_number}.jpg`);
        const url = S3Utils.signUrl(src.bucket, key);
        const img = await canvasLib.loadImage(url);
        context.drawImage(img,
          0, 0, img.width, img.height,
          (colIdx * spriteW), (rowIdx * spriteH), spriteW, spriteH);
      }
      rowIdx++;
    }

    prefix = this.makeOutputPath(src.key, States.CreateSpriteImages);
    const name = `${src.index}.jpg`;
    const key = PATH.join(prefix, name);
    const image = canvas.toBuffer('image/jpeg', {
      quality: 0.95,
    });
    await S3Utils.upload(src.bucket, key, image, {
      ContentType: 'image/jpeg',
      ContentDisposition: `attachment; filename="${name}"`,
    });
    return name;
  }

  async getExtractKeyframes(bucket, key) {
    const src = this.input;
    const result = await S3Utils.getObject(bucket, key)
      .then(data => JSON.parse(data.Body));
    result.frames = result.frames.splice(src.startIndex, src.framesPerSlice);
    return result;
  }

  createSpriteCanvas(canvasLib, totalFrames, spriteW, spriteH, maxPerRow) {
    const cols = Math.min(totalFrames, maxPerRow);
    let rows = Math.floor(totalFrames / maxPerRow);
    if ((totalFrames % maxPerRow) > 0) {
      rows++;
    }
    console.log(`canvas: ${cols}x${rows} [${spriteW * cols}x${spriteH * rows}] (${totalFrames})`);
    const canvas = canvasLib.createCanvas(spriteW * cols, spriteH * rows);
    return [
      canvas,
      canvas.getContext('2d'),
    ];
  }
}

module.exports = StateCreateSpriteImages;
