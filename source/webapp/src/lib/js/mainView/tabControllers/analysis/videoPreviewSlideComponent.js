// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import AppUtils from '../../../shared/appUtils.js';
import S3Utils from '../../../shared/s3utils.js';
import LocalCache from '../../../shared/localCache.js';
import KeyframeModal from './keyframe/keyframeModal.js';
import mxReadable from '../../../mixins/mxReadable.js';
import BaseSlideComponent from '../baseSlideComponent.js';

export default class VideoPreviewSlideComponent extends mxReadable(BaseSlideComponent) {
  constructor() {
    super();
    this.$execution = undefined;
    this.$ids = {
      ...super.ids,
      player: `vjs-${AppUtils.randomHexstring()}`,
    };
    this.$player = undefined;
    this.$trackCached = {};
    this.$mediaType = 'video/mp4';
    this.$localCache = LocalCache.getSingleton();
    this.$mapFramesShots = undefined;
    this.$spriteImages = undefined;
    this.$barChart = undefined;
    this.$vtts = [];
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          Close: 'video:preview:slide:control:close',
        },
      },
    };
  }

  static get Sprite() {
    return {
      Width: Math.round(960 / 8),
      Height: Math.round(540 / 8),
      MaxPerRow: 20,
    };
  }

  get execution() {
    return this.$execution;
  }

  set execution(val) {
    this.$execution = val;
  }

  get player() {
    return this.$player;
  }

  set player(val) {
    this.$player = val;
  }

  get trackCached() {
    return this.$trackCached;
  }

  set trackCached(val) {
    this.$trackCached = val;
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

  get mediaType() {
    return this.$mediaType;
  }

  get duration() {
    const streamInfo = ((this.execution.stateExtractKeyframes || {}).output || {}).streamInfo;
    return (!streamInfo)
      ? '--'
      : VideoPreviewSlideComponent.readableDuration(streamInfo.duration);
  }

  get mapFramesShots() {
    return this.$mapFramesShots;
  }

  set mapFramesShots(val) {
    this.$mapFramesShots = val;
  }

  get barChart() {
    return this.$barChart;
  }

  set barChart(val) {
    if (this.$barChart) {
      this.$barChart.destroy();
    }
    this.$barChart = val;
  }

  get vtts() {
    return this.$vtts;
  }

  set vtts(val) {
    this.$vtts = val;
  }

  get spriteImages() {
    return this.$spriteImages;
  }

  set spriteImages(val) {
    this.$spriteImages = val;
  }

  get localCache() {
    return this.$localCache;
  }

  async refresh(execution) {
    if (this.execution !== execution) {
      await this.hide();
      this.execution = execution;
      await this.loadAnalysisResults();
      await this.createSlide();
    }
    return super.show();
  }

  async hide() {
    await this.unload();
    await this.unloadAnalysisResults();
    this.execution = undefined;
    return super.hide();
  }

  async createSlide() {
    const close = this.createCloseButton();
    const title = $('<span/>').addClass('lead mx-auto align-self-center')
      .append(`${this.displayName} (${this.duration})`);
    const videoView = this.createVideoView();
    const analysisResults = await this.createAnalysisResults();
    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 d-flex m-4 mx-auto')
          .append(title))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(videoView)))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(analysisResults)))
      .append(close);
    this.slide.append(row);
    await this.load();
    return super.show();
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
      await this.beforeViewHide();
      this.slide.trigger(VideoPreviewSlideComponent.Events.Slide.Control.Close, [this.execution]);
    });
    return btn;
  }

  createVideoView() {
    const poster = this.execution.getPosterUrl();
    const videoEl = $('<video/>').addClass('video-js vjs-fluid w-100')
      .attr('id', this.ids.player)
      .attr('controls', 'controls')
      .attr('preload', 'metadata')
      .attr('poster', poster)
      .attr('crossorigin', 'anonymous');

    return $('<div/>').addClass('col-9 p-0 m-0 mx-auto')
      .append(videoEl);
  }

  async createAnalysisResults() {
    const statView = this.createStatisticsView();
    const trackView = this.createTrackView();
    const keyframesView = await this.createKeyframesView();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append(statView))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append(trackView))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append(keyframesView));
    return row;
  }

  createStatisticsView() {
    const desc = $('<p/>').addClass('lead-sm')
      .append(Localization.Messages.StatisticsDesc);

    let datasets = this.mapFramesShots.reduce((a0, x0) =>
      a0.concat(Object.keys(x0.customLabels)), []);
    datasets = [...new Set(datasets)].map(label => ({
      label,
      backgroundColor: AppUtils.randomRGB(),
      data: [],
    }));

    const barChartData = {
      labels: this.mapFramesShots.map(x =>
        VideoPreviewSlideComponent.readableDuration(x.endTime)),
      datasets,
    };

    const overall = {
      totalFrames: 0,
      totalCustomLabels: {},
    };
    for (let i = 0; i < this.mapFramesShots.length; i++) {
      const shot = this.mapFramesShots[i];
      overall.totalFrames += shot.frames.length;
      datasets.forEach((dataset) => {
        if (!overall.totalCustomLabels[dataset.label]) {
          overall.totalCustomLabels[dataset.label] = 0;
        }
        if (shot.customLabels[dataset.label]) {
          const percentage = Number.parseFloat(((shot.customLabels[dataset.label].length / (shot.frames.length || 1)) * 100).toFixed(2));
          dataset.data.push(percentage);
          overall.totalCustomLabels[dataset.label] += shot.customLabels[dataset.label].length;
        } else {
          dataset.data.push(0);
        }
      });
    }
    // insert overall column
    barChartData.labels.splice(0, 0, Localization.Messages.Overall);
    Object.keys(overall.totalCustomLabels).forEach((label) => {
      const percentage = Number.parseFloat(((overall.totalCustomLabels[label] / overall.totalFrames) * 100).toFixed(2));
      const dataset = barChartData.datasets.find(x => x.label === label);
      dataset.data.splice(0, 0, percentage);
    });

    const chartId = AppUtils.randomHexstring();
    const canvas = $('<canvas/>')
      .attr('id', chartId);
    const ctx = canvas[0].getContext('2d');
    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: barChartData,
      options: {
        title: {
          display: true,
          text: Localization.Messages.LineChartTitle,
        },
        tooltips: {
          mode: 'index',
          intersect: false,
        },
        responsive: true,
        scales: {
          yAxes: [
            {
              ticks: {
                max: 100,
                min: 0,
                stepSize: 25,
              },
            },
          ],
        },
      },
    });

    const col = $('<div/>').addClass('col-9 p-0 m-4 mx-auto');
    return col.append($('<p/>').addClass('lead')
      .append(desc))
      .append(canvas);
  }

  createTrackView() {
    const desc = $('<p/>').addClass('lead-sm')
      .append(Localization.Messages.TrackDesc);

    const tracks = this.vtts.map((vtt) => {
      const basename = vtt.substring(0, vtt.lastIndexOf('.')).split('/').pop();
      this.trackRegister(basename, vtt);
      return this.createTrackButton(basename);
    });

    const col = $('<div/>').addClass('col-9 p-0 m-4 mx-auto')
      .append(desc)
      .append(tracks);
    return col;
  }

  async createKeyframesView() {
    const col = $('<div/>').addClass('col-9 p-0 m-4 mx-auto');
    const desc = $('<p/>').addClass('lead-sm')
      .append(Localization.Messages.KeyframesDesc);
    col.append(desc);

    const shots = await Promise.all(this.mapFramesShots.map(x =>
      this.createPerShotDetail(x)));
    shots.filter(x => x).forEach(shot =>
      col.append(shot));

    return col;
  }

  createTrackButton(name, prefix) {
    const displayName = (prefix ? `${prefix} ${name}` : name).replace(/_/g, ' ');
    const btn = $('<button/>').addClass('btn btn-sm btn-primary text-capitalize mb-1 ml-1')
      .attr('type', 'button')
      .attr('data-toggle', 'button')
      .attr('aria-pressed', false)
      .attr('autocomplete', 'off')
      .attr('data-track-name', name)
      .append(displayName);
    btn.off('click').on('click', async (event) => {
      const enableNow = btn.attr('aria-pressed') === 'false';
      console.log(`${btn.data('trackName')} ${enableNow}`);
      return this.trackToggle(name, enableNow);
    });
    return btn;
  }

  async createPerShotDetail(shot) {
    const title = `${VideoPreviewSlideComponent.readableDuration(shot.startTime)} - ${VideoPreviewSlideComponent.readableDuration(shot.endTime)}`;

    const details = $('<details/>').addClass('ml-0 my-2')
      .attr('data-loaded', false)
      .append($('<summary/>').addClass('lead-sm')
        .append(title));

    details.on('toggle', async () => {
      if (details.prop('data-loaded') === true) {
        return true;
      }
      try {
        this.loading(true);
        await this.loadShotDetail(details, shot);
        details.prop('data-loaded', true);
        return true;
      } catch (e) {
        console.error(e);
        return false;
      } finally {
        this.loading(false);
      }
    });
    return details;
  }

  async loadShotDetail(parent, shot) {
    const tags = $('<p/>').addClass('lead-sm mt-2')
      .append($('<strong/>')
        .append(Localization.Messages.Labels));

    // no image / no metadata
    const labels = Object.keys(shot.customLabels);
    if (!labels.length) {
      tags.append($('<span/>').addClass('lead-sm ml-2')
        .append(Localization.Messages.DataNotAvailable.toLowerCase()));
      return parent.append(tags);
    }

    let framesContainLabels = labels.reduce((a0, c0) =>
      a0.concat(shot.customLabels[c0]), []);
    framesContainLabels = [...new Set(framesContainLabels)];

    while (labels.length) {
      const label = labels.shift();
      const percent = ((shot.customLabels[label].length / shot.frames.length) * 100).toFixed(2);
      tags.append($('<span/>').addClass('badge badge-pill badge-primary ml-1')
        .addClass('lead-xxs')
        .append(`${label} (${percent}%)`));
    }

    // load sprite image
    const key = `${this.spriteImages.prefix}/${shot.minIndex}.jpg`;
    const url = await this.localCache.getImageURL(`${this.spriteImages.bucket}/${key}`, {
      bucket: this.spriteImages.bucket,
      key,
    }).catch(() => undefined);

    const spriteW = this.spriteImages.width;
    const spriteH = this.spriteImages.height;
    const itemsPerRow = this.spriteImages.maxPerRow;

    const frames = shot.frames.slice(0);
    let rowIdx = 0;
    while (frames.length) {
      const splices = frames.splice(0, itemsPerRow);
      for (let colIdx = 0; colIdx < splices.length; colIdx++) {
        const offsetW = 0 - (colIdx * spriteW);
        const offsetH = 0 - (rowIdx * spriteH);

        let opacity = 0.5;
        const idx = framesContainLabels.findIndex(x => x === splices[colIdx]);
        if (idx >= 0) {
          framesContainLabels.splice(idx, 1);
          opacity = 1.0;
        }

        const sprite = $('<img/>').addClass('sprite d-inline-flex')
          .attr('src', url)
          .css('object-position', `${offsetW}px ${offsetH}px`)
          .css('opacity', opacity)
          .attr('width', spriteW)
          .attr('height', spriteH);
        sprite.on('click', async (event) => {
          event.preventDefault();
          return this.createKeyframeModal(shot.minIndex, splices[colIdx]);
        });
        parent.append(sprite);
      }
      rowIdx++;
    }
    return parent.append(tags);
  }

  async createKeyframeModal(shotNum, frameNum) {
    const modal = new KeyframeModal(this, shotNum, frameNum);
    modal.modal.on('hidden.bs.modal', async (event) =>
      modal.destroy());
    return modal.show();
  }

  async load() {
    const player = videojs(this.ids.player, {
      textTrackDisplay: {
        allowMultipleShowingTracks: true,
      },
    });
    player.markers({
      markers: [],
    });
    const src = this.execution.getProxyVideoUrl();
    player.src({
      type: this.mediaType,
      src,
      // src: this.execution.getProxyVideoUrl(),
    });
    player.load();
    this.player = player;
    return this;
  }

  async unload() {
    if (this.player) {
      this.player.dispose();
    }
    this.player = undefined;
    this.trackCached = {};
    return this;
  }

  async beforeViewHide() {
    if (this.player) {
      this.player.pause();
    }
    return this;
  }

  async loadAnalysisResults() {
    this.barChart = undefined;

    if (!this.execution) {
      return this;
    }

    const mapFramesShots = this.execution.stateMapFramesShots.output;
    [
      this.mapFramesShots,
    ] = await Promise.all([
      S3Utils.getObject(mapFramesShots.bucket, mapFramesShots.key)
        .then(data => JSON.parse(data.Body)),
    ]);

    const createSpriteImages = this.execution.stateCreateSpriteImages.output;
    const keys = await S3Utils.listObjects(createSpriteImages.bucket, createSpriteImages.prefix)
      .then(data => data.Key);
    this.spriteImages = {
      ...createSpriteImages.sprite,
      bucket: createSpriteImages.bucket,
      prefix: createSpriteImages.prefix,
      keys,
    };

    return this;
  }

  async unloadAnalysisResults() {
    this.mapFramesShots = undefined;
    this.spriteImages = undefined;
    this.vtts.length = 0;
  }

  async play() {
    if (this.player) {
      this.player.play();
    }
    return this;
  }

  async pause() {
    if (this.player) {
      this.player.pause();
    }
    return this;
  }

  async seek(time) {
    if (this.player) {
      this.player.currentTime(time);
    }
    return this;
  }

  getCurrentTime() {
    return (this.player)
      ? Math.floor((this.player.currentTime() * 1000) + 0.5)
      : undefined;
  }

  trackIsEnabled(label) {
    if (this.player) {
      const tracks = this.player.remoteTextTracks();
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].label === label) {
          return tracks[i].mode === 'showing';
        }
      }
    }
    return false;
  }

  trackRegister(label, key, language = 'en', kind = 'subtitles') {
    this.trackCached[label] = {
      key,
      language,
      kind,
      loaded: false,
    };
    return this;
  }

  trackUnregister(label) {
    delete this.trackCached[label];
    return this;
  }

  async trackLoad(label) {
    if (this.player) {
      const output = this.execution.stateCreateTimeline.output;
      const src = S3Utils.signUrl(output.bucket, this.trackCached[label].key);
      const track = this.player.addRemoteTextTrack({
        kind: this.trackCached[label].kind,
        language: this.trackCached[label].language,
        label,
        src,
      }, false);
      track.off('load');
      track.on('load', (event) => {
        const selected = event.target.track;
        selected.mode = 'showing';
        this.trackLoadedEvent(selected);
      });
    }
    return this;
  }

  async trackToggle(label, on) {
    if (this.player) {
      const tracks = this.player.remoteTextTracks();
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].label === label) {
          tracks[i].mode = (on) ? 'showing' : 'hidden';
          return this.markerToggle(tracks[i], on);
        }
      }
    }
    /* if track is cached but not loaded, load it now */
    return (on && this.trackCached[label] && !this.trackCached[label].loaded)
      ? this.trackLoad(label)
      : this;
  }

  trackLoadedEvent(track) {
    this.trackCached[track.label].loaded = true;
    this.markerAdd(track);
    return this;
  }

  markerAdd(track) {
    const markers = [];
    for (let i = 0; i < track.cues.length; i++) {
      markers.push({
        time: track.cues[i].startTime,
        duration: track.cues[i].endTime - track.cues[i].startTime,
        text: track.label,
        overlayText: track.label,
      });
    }
    this.player.markers.add(markers);
    return this;
  }

  markerRemove(track) {
    const indices = [];
    const markers = this.player.markers.getMarkers();
    for (let i = 0; i < markers.length; i++) {
      if (markers[i].overlayText === track.label) {
        indices.push(i);
      }
    }
    this.player.markers.remove(indices);
    return this;
  }

  markerToggle(track, on) {
    return (on)
      ? this.markerAdd(track)
      : this.markerRemove(track);
  }
}
