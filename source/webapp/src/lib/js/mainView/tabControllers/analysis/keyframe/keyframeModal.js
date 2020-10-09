import Localization from '../../../../shared/localization.js';
import LocalCache from '../../../../shared/localCache.js';
import S3Utils from '../../../../shared/s3utils.js';
import AppUtils from '../../../../shared/appUtils.js';

export default class KeyframeModal {
  constructor(parent, shotNum, frameNum) {
    this.$parent = parent;
    this.$shotNum = shotNum;
    this.$frameNum = frameNum;
    this.$localCache = LocalCache.getSingleton();
    this.$modal = $('<div/>').addClass('modal fade')
      .attr('tabindex', -1)
      .attr('role', 'dialog')
      .attr('aria-labelledby', 'keyframeModal')
      .attr('aria-hidden', true);
  }

  get parent() {
    return this.$parent;
  }

  get shotNum() {
    return this.$shotNum;
  }

  get frameNum() {
    return this.$frameNum;
  }

  get localCache() {
    return this.$localCache;
  }

  get modal() {
    return this.$modal;
  }

  get execution() {
    return this.parent.execution;
  }

  async show() {
    const dialog = await this.createModal();
    this.modal.append(dialog);
    this.parent.getSlide().append(this.modal);
    this.modal.modal('show');
  }

  async destroy() {
    this.modal.remove();
  }

  async createModal() {
    const [
      image,
      overlay,
      canvasContainer,
      imageView,
    ] = await this.createImageView();
    const analysisView = await this.createAnalysisView(image, overlay, canvasContainer);

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 m-0 p-0')
        .append(imageView))
      .append($('<div/>').addClass('col-12 m-0 p-0')
        .append(analysisView));

    const dialog = $('<div/>').addClass('modal-dialog modal-lg')
      .attr('role', 'document')
      .append($('<div/>').addClass('modal-content')
        .css('border-radius', 0)
        .append(row));
    return dialog;
  }

  async createImageView() {
    const stateOutput = this.execution.stateExtractKeyframes.output;
    const key = `${stateOutput.prefix}/${this.frameNum}.jpg`;
    const url = await this.localCache.getImageURL(`${stateOutput.bucket}/${key}`, {
      bucket: stateOutput.bucket,
      key,
    });

    const overlay = $('<div/>').addClass('lead-sm shot-info')
      .css('position', 'absolute')
      .css('top', '1rem')
      .css('left', '1rem')
      .append($('<span/>').addClass('badge badge-pill badge-secondary mr-1 mb-1 lead-xs text-left d-block')
        .append(`Shot ${this.shotNum} : Frame ${this.frameNum}`));

    const container = $('<div/>').addClass('p-0 m-0');
    const canvases = $('<div/>').addClass('canvas-list');
    const image = $('<img/>')
      .attr('width', '100%')
      .attr('src', url);

    return [
      image,
      overlay,
      canvases,
      container
        .append(image)
        .append(overlay)
        .append(canvases),
    ];
  }

  async createAnalysisView(image, overlay, canvasContainer) {
    const container = $('<div/>').addClass('col-12 mx-2 my-4');

    const stateOutput = this.execution.stateDetectCustomLabels.output;
    const key = `${stateOutput.prefix}/${this.frameNum}.json`;
    let analysis = await S3Utils.getObject(stateOutput.bucket, key).catch(() => undefined);
    if (!analysis) {
      return container
        .append($('<p/>').addClass('lead-sm')
          .append(Localization.Messages.DataNotAvailable));
    }

    const url = URL.createObjectURL(new Blob([analysis.Body], {
      type: 'application/json',
    }));
    const download = $('<a/>').addClass('btn btn-sm btn-success text-capitalize lead-xxs')
      .attr('href', url)
      .attr('target', '_blank')
      .attr('download', key.substring(0, key.lastIndexOf('.')).split('/').pop())
      .attr('role', 'button')
      .append(Localization.Buttons.DownloadFrameAnalysis);

    analysis = JSON.parse(analysis.Body);
    this.showTimecodeSMPTE(overlay, analysis.TimecodeSMPTE);

    const labels = this.parseLabels(image, canvasContainer, analysis);
    const padding = $('<div/>').addClass('my-2')
      .append('&nbsp;');

    container
      .append(download)
      .append(labels)
      .append(padding);
    return container;
  }

  parseLabels(image, canvasContainer, analysis) {
    const details = $('<details/>').addClass('mt-4')
      .append($('<summary/>').addClass('lead-sm')
        .append(`${Localization.Messages.Labels} (${analysis.CustomLabels.length})`));

    let idx = 0;
    while (analysis.CustomLabels.length) {
      const label = analysis.CustomLabels.shift();
      // extract features
      const box = (label.Geometry)
        ? label.Geometry.BoundingBox
        : {
          Width: 1,
          Height: 1,
          Top: 0,
          Left: 0,
        };
      const name = `${label.Name} ${idx} (${label.Confidence.toFixed(2)})`;
      const btn = this.createCanvasButton(canvasContainer, image, name, box);
      details.append(btn);
      idx++;
    }
    return details;
  }

  createCanvasButton(canvasContainer, image, name, box, attrs) {
    const id = AppUtils.randomHexstring();
    const btn = $('<button/>').addClass('btn btn-sm btn-primary text-capitalize lead-xxs mb-1 ml-1')
      .attr('type', 'button')
      .attr('data-toggle', 'button')
      .attr('aria-pressed', false)
      .attr('autocomplete', 'off')
      .append(name);
    btn.off('click').on('click', (event) => {
      const enableNow = btn.attr('aria-pressed') === 'false';
      if (!enableNow) {
        return this.removeCanvasOverlay(canvasContainer, id);
      }
      const [
        canvas,
        overlay,
      ] = this.createCanvasOverlay(image, id, box, {
        name,
        ...attrs,
      });
      if (canvas) {
        canvasContainer.append(canvas);
      }
      return canvasContainer
        .append(overlay);
    });
    return btn;
  }

  removeCanvasOverlay(canvasContainer, id) {
    canvasContainer.find(`#canvas-${id}`).remove();
    canvasContainer.find(`#overlay-${id}`).remove();
  }

  createCanvasOverlay(image, id, box, attrs) {
    let canvas;
    let w, h, x0, y0;
    if (box) {
      w = Math.min(Math.round(box.Width * image.width()), image.width());
      h = Math.min(Math.round(box.Height * image.height()), image.height());
      x0 = Math.max(Math.round(box.Left * image.width()), 0);
      y0 = Math.max(Math.round(box.Top * image.height()), 0);
      canvas = $('<canvas/>')
        .attr('id', `canvas-${id}`)
        .attr('width', w)
        .attr('height', h)
        .css('left', x0)
        .css('top', y0);
    } else {
      w = 0;
      h = 0;
      x0 = Math.round(image.width() * 0.6667);
      y0 = 2;
    }

    const overlay = $('<div/>').addClass('canvas-overlay mx-1 lead-xxs')
      .attr('id', `overlay-${id}`)
      .css('left', x0 + w)
      .css('top', y0);
    Object.keys(attrs).forEach((key) => {
      if (attrs[key]) {
        overlay
          .append($('<div/>').addClass('m-1')
            .append($('<span/>').append(`${key}:`))
            .append($('<span/>').addClass('ml-2').append(attrs[key])));
      }
    });
    return [
      canvas,
      overlay,
    ];
  }

  estimatePoseOrientation(pose) {
    if (!pose) {
      return undefined;
    }
    const upDown = (pose.Pitch > 2)
      ? (pose.Pitch > 10)
        ? 'up'
        : 'slight-up'
      : (pose.Pitch < -2)
        ? (pose.Pitch < -10)
          ? 'down'
          : 'slight-down'
        : 'straight';
    const leftRight = (pose.Yaw > 2)
      ? (pose.Yaw > 10)
        ? 'right'
        : 'slight-right'
      : (pose.Yaw < -2)
        ? (pose.Yaw < -10)
          ? 'left'
          : 'slight-left'
        : 'straight';
    const tilt = (pose.Roll > 2)
      ? (pose.Roll > 10)
        ? 'tilt-right'
        : 'tilt-slight-right'
      : (pose.Roll < -2)
        ? (pose.Roll < -10)
          ? 'tilt-left'
          : 'tilt-slight-left'
        : 'straight';
    return [...new Set([upDown, leftRight, tilt])].join(', ');
  }

  showTimecodeSMPTE(overlay, timecode) {
    if (!timecode) {
      return undefined;
    }
    return overlay.append($('<span/>').addClass('badge badge-pill badge-dark mr-1 mb-1 lead-xxs text-left d-block')
      .append(`Timecode (SMPTE): ${timecode}`));
  }

  resolveUrl(url) {
    return (url.indexOf('http') < 0)
      ? `https://${url}`
      : url;
  }
}
