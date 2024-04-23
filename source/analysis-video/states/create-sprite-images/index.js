// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PATH = require('path');
const Jimp = require('jimp');
const {
  States,
  S3Utils,
} = require('core-lib');
const SpriteHelper = require('../shared/spriteHelper');
const BaseState = require('../shared/baseState');

const BORDER_SIZE = 1;

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

    const combined = await this.createSpriteBackground(
      data.frames.length,
      spriteW,
      spriteH,
      maxPerRow
    );

    let rowIdx = 0;
    while (data.frames.length) {
      const splices = data.frames.splice(0, 20);
      for (let colIdx = 0; colIdx < splices.length; colIdx++) {
        const frame = splices[colIdx];
        const key = PATH.join(prefix, `${frame.coded_picture_number}.jpg`);

        // scale and crop image
        const img = await this.readImage(src.bucket, key);
        const factor = spriteW / img.bitmap.width;
        const scaled = img.scale(factor);

        const w = scaled.bitmap.width - (BORDER_SIZE * 2);
        const h = scaled.bitmap.height - (BORDER_SIZE * 2);
        const cropped = scaled.crop(BORDER_SIZE, BORDER_SIZE, w, h);

        const l = colIdx * spriteW + BORDER_SIZE;
        const t = rowIdx * spriteH + BORDER_SIZE;
        combined.blit(cropped, l, t);
      }
      rowIdx++;
    }

    prefix = this.makeOutputPath(src.key, States.CreateSpriteImages);
    const name = `${src.index}.jpg`;
    const key = PATH.join(prefix, name);

    const jpeg = await combined.quality(80).getBufferAsync(Jimp.MIME_JPEG);

    await S3Utils.upload(src.bucket, key, jpeg, {
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

  async createSpriteBackground(
    totalFrames,
    spriteW,
    spriteH,
    maxPerRow
  ) {
    return new Promise((resolve, reject) => {
      const cols = Math.min(totalFrames, maxPerRow);
      let rows = Math.floor(totalFrames / maxPerRow);
      if ((totalFrames % maxPerRow) > 0) {
        rows++;
      }

      const imgW = spriteW * cols;
      const imgH = spriteH * rows;

      console.log(`background: ${cols}x${rows} [${imgW}x${imgH}] (${totalFrames})`);

      // eslint-disable-next-line
      const _ = new Jimp(imgW, imgH, 0x000000ff, (e, image) => {
        if (e) {
          reject(e);
        } else {
          resolve(image);
        }
      });
    });
  }

  async readImage(bucket, key) {
    return new Promise((resolve, reject) => {
      const signed = S3Utils.signUrl(bucket, key);
      Jimp.read(signed)
        .then((img) => {
          resolve(img);
        })
        .catch((e) => {
          console.log(`ERR: readImage: ${key}: ${e.message}`);
          reject(e);
        });
    });
  }
}

module.exports = StateCreateSpriteImages;
