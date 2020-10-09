const OS = require('os');
const FS = require('fs');
const PATH = require('path');
const CHILD = require('child_process');
const FFMPEG = require('ffmpeg');
const {
  S3Utils,
} = require('core-lib');

const FRAMES_PER_SLICE = 600;

class FFmpegHelper {
  constructor() {
    this.$numOfCores = OS.cpus().length;
    this.$env = {
      ...process.env,
      LD_LIBRARY_PATH: `${FFMPEG.LD_LIBRARY_PATH}:${process.env.LD_LIBRARY_PATH}`,
    };
    this.$tmpDir = undefined;
  }

  get numOfCores() {
    return this.$numOfCores;
  }

  get env() {
    return this.$env;
  }

  get tmpDir() {
    return this.$tmpDir;
  }

  set tmpDir(val) {
    this.$tmpDir = val;
  }

  async cleanup() {
    if (!this.tmpDir) {
      FFmpegHelper.rmTmpDir(this.tmpDir);
    }
    this.tmpDir = undefined;
  }

  async extract(bucket, key) {
    this.tmpDir = FFmpegHelper.mkTmpDir();

    const frames = await this.ffprobe(bucket, key);

    await this.ffmpeg(bucket, key, frames);

    await this.cleanup();
  }

  async ffprobe(bucket, key) {
    const url = S3Utils.signUrl(bucket, key);

    const options = {
      cwd: undefined,
      env: this.env,
    };
    const params = [
      '-threads',
      this.numOfCores,
      '-v',
      'quiet',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name,codec_type,width,height,duration,bit_rate,nb_frames,r_frame_rate:frame=pict_type,coded_picture_number,best_effort_timestamp_time',
      '-read_intervals',
      '%+3600',
      '-of',
      'json',
      url,
    ];

    let response = CHILD.spawnSync(`${FFMPEG.PATH}/ffprobe`, params, options);
    if (response.status !== 0) {
      console.log(response.stderr.toString());
      throw new Error(response.error);
    }
    response = JSON.parse(response.stdout.toString());
    // only care keyframe
    response.frames = response.frames.filter(x => x.pict_type === 'I');
    return response;
  }

  async ffmpeg(bucket, key, frames, outDir) {
    const url = S3Utils.signUrl(bucket, key);

    const options = {
      cwd: undefined,
      env: this.env,
    };
    const common = [
      '-threads',
      this.numOfCores,
      '-y',
      '-v',
      'quiet',
    ];
    const input = [
      '-i',
      url,
    ];

    const selects = [];
    const images = [];
    while (frames.length) {
      const slices = frames.splice(0, FRAMES_PER_SLICE);
      while (slices.length) {
        const frame = slices.shift();

        images.splice(images.length, 0, {
          codedPictureNumber: frame.coded_picture_number,
          image: `${outDir}/${images.length + 1}.jpg`,
        });
        selects.push(`eq(n\\,${frame.coded_picture_number})`);
      }
    }
    const output = [
      '-map',
      '0:v',
      '-vf',
      `select='${selects.join('+')}'`,
      '-vsync',
      0,
      '-q:v',
      1,
      `${outDir}/%d.jpg`,
    ];
    const response = CHILD.spawnSync(`${FFMPEG.PATH}/ffmpeg`, [].concat(common, input, output), options);
    if (response.status !== 0) {
      throw new Error(response.error);
    }

    let result = FS.readdirSync(outDir);
    result = result.filter(x => PATH.parse(x).ext === '.jpg');
    console.log(`Extracted (${result.length} images): ${JSON.stringify(result, null, 2)}`);

    return images;
  }

  async showStreams(bucket, key) {
    const url = S3Utils.signUrl(bucket, key);

    const options = {
      cwd: undefined,
      env: this.env,
    };
    const params = [
      '-threads',
      this.numOfCores,
      '-v',
      'quiet',
      '-show_format',
      '-show_streams',
      '-of',
      'json',
      url,
    ];

    const response = CHILD.spawnSync(`${FFMPEG.PATH}/ffprobe`, params, options);
    if (response.status !== 0) {
      console.log(response.stderr.toString());
      throw new Error(response.error);
    }
    return JSON.parse(response.stdout.toString());
  }

  static mkTmpDir() {
    return FS.mkdtempSync(PATH.join(OS.tmpdir(), 'frames-'));
  }

  static rmTmpDir(tmp) {
    const response = CHILD.spawnSync('rm', [
      '-rfv',
      tmp,
    ]);
    return response.stdout.toString();
  }
}

module.exports = FFmpegHelper;
