// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import BaseSlideComponent from '../baseSlideComponent.js';
import StateMachineWatchDog, {
  StateMachineExecution,
} from '../../../shared/stateMachineWatchDog.js';
import S3Utils from '../../../shared/s3utils.js';

export default class ImagePreviewSlideComponent extends BaseSlideComponent {
  constructor() {
    super();
    this.$execution = undefined;
    this.$customLabels = undefined;
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          Close: 'image:preview:slide:control:close',
        },
      },
    };
  }

  get execution() {
    return this.$execution;
  }

  set execution(val) {
    this.$execution = val;
  }

  get customLabels() {
    return this.$customLabels;
  }

  set customLabels(val) {
    this.$customLabels = val;
  }

  get displayName() {
    if (!this.execution) {
      return undefined;
    }
    return this.execution.input.input.key.split('/').pop();
  }

  get basename() {
    if (!this.execution) {
      return undefined;
    }
    const key = this.execution.input.input.key;
    return key.substring(0, key.lastIndexOf('.')).split('/').pop();
  }

  async hide() {
    this.execution = undefined;
    this.customLabels = undefined;
    return super.hide();
  }

  async refresh(execution) {
    if (this.execution !== execution) {
      await this.hide();
      this.execution = execution;
      await this.createSlide();
    }
    return super.show();
  }

  async createSlide() {
    await this.loadAnalysisResults();

    const close = this.createCloseButton();
    const preview = this.createPreview();
    const result = this.createResultView();
    this.slide.append($('<div/>').addClass('row no-gutters')
      .append(preview)
      .append(result)
      .append(close));
    return this.slide;
  }

  createCloseButton() {
    const icon = $('<i/>').addClass('far fa-times-circle text-secondary')
      .attr('data-toggle', 'tooltip')
      .attr('data-placement', 'bottom')
      .attr('title', Localization.Buttons.ClosePreview)
      .css('font-size', '1.8rem');
    icon.tooltip();

    const btn = $('<div/>').addClass('close-preview')
      .append($('<button/>').addClass('btn btn-sm btn-link')
        .attr('type', 'button')
        .append(icon));
    btn.off('click').on('click', async (event) => {
      event.preventDefault();
      this.slide.trigger(ImagePreviewSlideComponent.Events.Slide.Control.Close, [this.execution]);
    });
    return btn;
  }

  createPreview() {
    const preview = $('<div/>').addClass('col-12 p-0 m-0')
      .append(this.createTitle())
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append(this.createImageView()));
    return preview;
  }

  createTitle() {
    return $('<div/>').addClass('col-9 p-0 mt-4 mx-auto')
      .append($('<p/>').addClass('lead')
        .html(this.displayName));
  }

  createImageView() {
    const container = $('<div/>').addClass('p-0 m-0');
    const canvases = $('<div/>').addClass('canvas-list');
    const image = $('<img/>').addClass('img-contain img-w100 area-selected')
      .attr('src', this.execution.getPosterUrl());

    const overlay = $('<div/>').addClass('lead-sm collapse')
      .css('position', 'absolute')
      .css('top', '1rem')
      .css('left', '1rem')
      .html('no data');

    image.on('load', () => {
      const imageW = image.width();
      const imageH = image.height();
      // TODO: display Custom Label here!
      const labels = this.customLabels.CustomLabels;

      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const box = (label.Geometry)
          ? label.Geometry.BoundingBox
          : {
            Width: 1,
            Height: 1,
            Left: 0,
            Top: 0,
          };
        const w = Math.min(Math.floor(box.Width * imageW), imageW);
        const h = Math.min(Math.floor(box.Height * imageH), imageH);
        const x0 = Math.max(Math.floor(box.Left * imageW), 0);
        const y0 = Math.max(Math.floor(box.Top * imageH), 0);
        const canvas = $('<canvas/>')
          .attr('width', w)
          .attr('height', h)
          .attr('data-toggle', 'tooltip')
          .attr('data-placement', 'bottom')
          .css('left', x0)
          .css('top', y0)
          .css('position', 'absolute')
          .tooltip();
        const badge = $('<span/>').addClass('badge badge-pill lead-sm');
        const title = `${label.Name} (${Number.parseFloat(label.Confidence).toFixed(2)}%)`;
        badge.addClass('badge-success').html(title);
        canvas.addClass('area-custom-label')
          .attr('title', title);
        canvas.hover(() =>
          overlay.html(badge.prop('outerHTML')).removeClass('collapse'), () =>
          overlay.html(badge.prop('outerHTML')).addClass('collapse'));
        canvases.append(canvas);
      }
      canvases.append(overlay);
    });
    container.append(image).append(canvases);

    const view = $('<div/>').addClass('col-8 p-0 m-0')
      .append(container);
    const legend = this.createLegend();
    return $('<div/>').addClass('col-9 p-0 m-4 mx-auto d-flex')
      .append(view)
      .append(legend);
  }

  createResultView() {
    return $('<div/>').addClass('col-12 p-0 m-0 bg-light')
      .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
        .append(this.createJsonView()));
  }

  createJsonView() {
    const code = $('<pre/>').addClass('ml-2 lead-xxs collapse')
      .append(JSON.stringify(this.customLabels, null, 2));
    const download = $('<a/>').addClass('btn btn-sm btn-link text-lowercase')
      .attr('role', 'button')
      .attr('href', this.getJsonSignedUrl())
      .attr('target', '_blank')
      .attr('download', `${this.basename}.json`)
      .html(`(${Localization.Messages.Download})`);

    const viewJson = $('<details/>').addClass('py-1')
      .append($('<summary/>')
        .append($('<span/>').addClass('lead-sm')
          .append(Localization.Messages.ViewJson)
          .append(download)))
      .append(code);

    viewJson.off('toggle').on('toggle', () =>
      ((viewJson[0].open)
        ? code.removeClass('collapse')
        : code.addClass('collapse')));
    return viewJson;
  }

  createLegend() {
    const legend = $('<dl/>').addClass('row lead-xs ml-2');
    const uniqueLabels = [...new Set(this.customLabels.CustomLabels.map(x => x.Name))];
    for (let i = 0; i < uniqueLabels.length; i++) {
      const label = uniqueLabels[i];
      const instances = this.customLabels.CustomLabels.filter(x => x.Name === label);
      legend
        .append($('<dt/>').addClass('text-left col-sm-9')
          .append($('<canvas/>').addClass('area-custom-label mr-2')
            .attr('width', '10rem')
            .attr('height', '8rem'))
          .append(label))
        .append($('<dd/>').addClass('col-sm-3')
          .append(instances.length));
    }
    return $('<div/>').addClass('col-4 p-0 mt-4')
      .append(legend);
  }

  async loadAnalysisResults() {
    const output = (this.execution.stateDetectCustomLabels || {}).output;
    this.customLabels = await S3Utils.getObject(output.bucket, output.key)
      .then(data => JSON.parse(data.Body));
  }

  getJsonSignedUrl() {
    const output = (this.execution.stateDetectCustomLabels || {}).output;
    return S3Utils.signUrl(output.bucket, output.key);
  }
}
