// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import mxReadable from '../mixins/mxReadable.js';
import AppUtils from './appUtils.js';
import ApiHelper from './apiHelper.js';
import LocalCache from './localCache.js';
import Localization from './localization.js';
import S3Utils from './s3utils.js';

export class StateMachineExecution extends mxReadable(class {}) {
  constructor(data) {
    super(data);
    this.$data = this.parseJsonData(data);
    this.$prefetched = undefined;
    this.$listItem = undefined;
  }

  parseJsonData(data) {
    const parsed = JSON.parse(JSON.stringify(data));
    parsed.startDate = new Date(parsed.startDate);
    if (parsed.stopDate) {
      parsed.stopDate = new Date(parsed.stopDate);
    }
    parsed.input = JSON.parse(parsed.input);
    if (parsed.output) {
      parsed.output = JSON.parse(parsed.output);
    }
    return parsed;
  }

  static get Status() {
    return {
      Running: 'RUNNING',
      Succeeded: 'SUCCEEDED',
      Failed: 'FAILED',
      TimedOut: 'TIMED_OUT',
      Aborted: 'ABORTED',
    };
  }

  get data() {
    return this.$data;
  }

  get executionArn() {
    return this.data.executionArn;
  }

  get stateMachineArn() {
    return this.data.stateMachineArn;
  }

  get name() {
    return this.data.name;
  }

  get status() {
    return this.data.status;
  }

  get runningState() {
    return this.data.runningState;
  }

  get startDate() {
    return this.data.startDate;
  }

  get stopDate() {
    return this.data.stopDate;
  }

  get input() {
    return this.data.input;
  }

  get output() {
    return this.data.output;
  }

  get prefetched() {
    return this.$prefetched;
  }

  set prefetched(val) {
    this.$prefetched = val;
  }

  get listItem() {
    return this.$listItem;
  }

  set listItem(val) {
    this.$listItem = val;
  }

  get stateExtractKeyframes() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.ExtractKeyframes];
  }

  get statePrepareLabelingJob() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.PrepareLabelingJob];
  }

  get stateStartLabelingJob() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.StartLabelingJob];
  }

  get stateCollectAnnotations() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.CollectAnnotations];
  }

  get stateCreateProjectVersion() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.CreateProjectVersion];
  }

  get stateCheckTrainingJob() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.CheckTrainingJob];
  }

  get stateStartSegmentDetection() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.StartSegmentDetection];
  }

  get stateCollectSegmentResults() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.CollectSegmentResults];
  }

  get stateCreateTimeline() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.CreateTimeline];
  }

  get stateDetectCustomLabels() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.DetectCustomLabels];
  }

  get stateMapFramesShots() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.MapFramesShots];
  }

  get stateCreateSpriteImages() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.CreateSpriteImages];
  }

  get stateCreateShotElements() {
    return ((this.output || this.input).output || {})[SolutionManifest.States.CreateShotElements];
  }

  static testVideo(key) {
    return /[.mp4|.m4v|.mov|.MP4|.M4V|.MOV]$/.test(key);
  }

  static testImage(key) {
    return /[.jpg|.jpeg|.png|.JPG|.JPEG|.PNG]$/.test(key);
  }

  isVideo() {
    const src = this.input.input || {};
    return StateMachineExecution.testVideo(src.key);
  }

  isImage() {
    const src = this.input.input || {};
    return StateMachineExecution.testImage(src.key);
  }

  getPosterUrl() {
    return this.prefetched;
  }

  getProxyVideoUrl() {
    const src = this.input.input || {};
    return S3Utils.signUrl(src.bucket, src.key);
  }

  update(data) {
    const dirty = (this.status !== data.status)
      || (this.runningState !== data.runningState)
      || (!this.output && data.output);
    this.$data = this.parseJsonData(data);
    return dirty;
  }

  createListItem() {
    const dateAdded = StateMachineExecution.isoDateTime(this.startDate);
    const dateCompleted = (this.stopDate)
      ? StateMachineExecution.isoDateTime(this.stopDate)
      : '--';
    let status = this.status === StateMachineExecution.Status.Succeeded
      ? 'badge-success'
      : this.status === StateMachineExecution.Status.Running
        ? 'badge-primary'
        : 'badge-danger';
    status = $('<span/>').addClass('badge badge-pill')
      .addClass(status)
      .addClass('lead-xxs')
      .append(this.status);

    const src = this.input.input || {};
    const runningState = this.runningState || '--';
    const dl = $('<dl/>').addClass('row lead-xs ml-2 my-2 col-9 no-gutters')
      .append($('<dt/>').addClass('text-left col-sm-2')
        .append(Localization.Messages.Name))
      .append($('<dd/>').addClass('col-sm-10 my-0 dd-name')
        .append(src.projectName || src.key || '--'))
      .append($('<dt/>').addClass('text-left col-sm-2 my-0')
        .append(Localization.Messages.Status))
      .append($('<dd/>').addClass('col-sm-10 my-0 dd-status')
        .append(status))
      .append($('<dt/>').addClass('text-left col-sm-2 my-0')
        .append(Localization.Messages.RunningState))
      .append($('<dd/>').addClass('col-sm-10 my-0 dd-running-state')
        .append(runningState))
      .append($('<dt/>').addClass('text-left col-sm-2 my-0')
        .append(Localization.Messages.DateAdded))
      .append($('<dd/>').addClass('col-sm-10 my-0 dd-date-added')
        .append(dateAdded))
      .append($('<dt/>').addClass('text-left col-sm-2 my-0')
        .append(Localization.Messages.DateCompleted))
      .append($('<dd/>').addClass('col-sm-10 my-0 dd-date-completed')
        .append(dateCompleted));

    const image = $('<img/>').addClass('btn-bg w-100 h-100')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('src', this.prefetched || '/images/video.jpg')
      .css('object-fit', 'cover');

    this.listItem = $('<li/>').addClass('list-group-item list-group-item-action row no-gutters d-flex')
      .attr('data-execution', this.name)
      .append($('<div/>').addClass('col-2')
        .append(image))
      .append($('<div/>').addClass('col-10')
        .append(dl));

    return this.listItem;
  }

  updateListItem() {
    if (!this.listItem) {
      return undefined;
    }
    const dateAdded = StateMachineExecution.isoDateTime(this.startDate);
    const dateCompleted = (this.stopDate)
      ? StateMachineExecution.isoDateTime(this.stopDate)
      : '--';
    const status = this.status === StateMachineExecution.Status.Succeeded
      ? 'badge-success'
      : this.status === StateMachineExecution.Status.Running
        ? 'badge-primary'
        : 'badge-danger';
    const runningState = this.runningState || '--';

    const dds = this.listItem.find('dd');
    for (let i = 0; i < dds.length; i++) {
      const dd = $(dds[i]);
      if (dd.hasClass('dd-date-added')) {
        dd.empty().append(dateAdded);
      } else if (dd.hasClass('dd-date-completed')) {
        dd.empty().append(dateCompleted);
      } else if (dd.hasClass('dd-running-state')) {
        dd.empty().append(runningState);
      }
    }
    const badge = this.listItem.find('.badge')
      .removeClass('badge-success badge-primary badge-danger')
      .addClass(status)
      .empty()
      .append(this.status);

    this.listItem.find('img').attr('src', this.prefetched);
    return this.listItem;
  }

  getListItem() {
    return this.listItem || this.createListItem();
  }

  async prefetch(localCache) {
    if (this.prefetched) {
      return true;
    }
    const blob = await localCache.getItem(this.name);
    if (blob) {
      this.prefetched = URL.createObjectURL(blob);
      return true;
    }
    const src = this.input.input;
    const key = src.key || src.keys[0];
    if (StateMachineExecution.testImage(key)) {
      this.prefetched = await localCache.getImageURL(this.name, {
        bucket: src.bucket,
        key,
      });
      return true;
    }

    const data = (this.stateExtractKeyframes || {}).output;
    if (!data) {
      return false;
    }
    const response = await S3Utils.listObjects(data.bucket, data.prefix, 100);
    const filtered = response.filter(x =>
      x.Key.substring(x.Key.lastIndexOf('.')) === '.jpg').sort((a, b) => b.Size - a.Size);
    if (!filtered[0]) {
      return false;
    }
    this.prefetched = await localCache.getImageURL(this.name, {
      bucket: data.bucket,
      key: filtered[0].Key,
    });
    return true;
  }

  getFrameShotMappingUrl() {
    const output = (this.stateMapFramesShots || {}).output;
    return (!output)
      ? undefined
      : S3Utils.signUrl(output.bucket, output.key);
  }

  async downloadFrameShotMapping() {
    const output = (this.stateMapFramesShots || {}).output;
    if (!output) {
      return undefined;
    }
    const response = await S3Utils.getObject(output.bucket, output.key);
    return JSON.parse(response.Body);
  }

  getTrainedModelPerformanceUrl() {
    const output = (this.stateCreateProjectVersion || {}).output;
    if (!output) {
      return undefined;
    }
    const parts = output.projectVersionArn.split('/');
    return `https://${SolutionManifest.Region}.console.aws.amazon.com/rekognition/custom-labels#/projects/${parts[1]}/models/${parts[3]}/performance`;
  }

  getExecutionUrl() {
    return `https://${SolutionManifest.Region}.console.aws.amazon.com/states/home?region=${SolutionManifest.Region}#/executions/details/${this.executionArn}`;
  }
}

export default class StateMachineWatchDog {
  constructor(name) {
    this.$name = name;
    this.$executions = [];
    this.$token = undefined;
    this.$localCache = LocalCache.getSingleton();
    this.$timer = undefined;
    this.$id = `step-${AppUtils.randomHexstring()}`;
    this.$eventSource = $('<div/>').addClass('collapse')
      .attr('id', this.$id);
    $('body').append(this.$eventSource);
  }

  static getSingleton(name) {
    if (!name) {
      throw new Error('missing state machine name');
    }
    if (!((window.AWSomeNamespace || {}).StateMachineWatchDogInstances || {})[name]) {
      window.AWSomeNamespace = {
        ...window.AWSomeNamespace,
        StateMachineWatchDogInstances: {
          [name]: new StateMachineWatchDog(name),
        },
      };
    }
    return window.AWSomeNamespace.StateMachineWatchDogInstances[name];
  }

  static get Events() {
    return {
      Execution: {
        Status: {
          NewAdded: 'execution:status:newadded',
          Changed: 'execution:status:changed',
          Removed: 'execution:status:removed',
        },
      },
    };
  }

  static get Constants() {
    return {
      ModelVersion: {
        Key: 'selected-model-version',
      },
    };
  }

  get name() {
    return this.$name;
  }

  get executions() {
    return this.$executions;
  }

  set executions(val) {
    if (!Array.isArray(val)) {
      throw new Error('invalid executions');
    }
    if (val.filter(x => !(x instanceof StateMachineExecution)).length) {
      throw new Error('invalid executions');
    }
    this.$executions = val.slice(0);
  }

  get token() {
    return this.$token;
  }

  set token(val) {
    this.$token = val;
  }

  get timer() {
    return this.$timer;
  }

  set timer(val) {
    this.$timer = val;
  }

  get localCache() {
    return this.$localCache;
  }

  get id() {
    return this.$id;
  }

  get eventSource() {
    return this.$eventSource;
  }

  async getStatus(execution) {
    return (!execution)
      ? this.getAllExecutionStatus()
      : this.getExecutionStatus(execution);
  }

  async getMoreExecutions() {
    return this.getAllExecutionStatus(true);
  }

  async getExecutionStatus(execution) {
    const name = (execution instanceof StateMachineExecution)
      ? execution.name
      : (execution && execution.indexOf('arn:aws:states') === 0)
        ? execution.split(':').pop()
        : execution;
    const params = {
      stateMachine: this.name,
      execution: name,
    };
    const response = (this.name === SolutionManifest.StateMachine.Analysis.Name)
      ? await ApiHelper.getAnalysisExecution(params)
      : await ApiHelper.getTrainingExecution(params);
    return this.updateExecution(response);
  }

  async getAllExecutionStatus(useToken = false) {
    const params = {
      stateMachine: this.name,
      maxResults: 20,
    };
    if (useToken) {
      params.token = this.token;
    }
    const response = (this.name === SolutionManifest.StateMachine.Analysis.Name)
      ? await ApiHelper.getAnalysisExecution(params)
      : await ApiHelper.getTrainingExecution(params);
    this.token = response.nextToken;
    await Promise.all(response.executions.map(execution =>
      this.updateExecution(execution)));
    // this.checkExecutionRemoval(response.executions.map(x => x.name));
    return this.executions;
  }

  async updateExecution(data) {
    let execution = this.executions.find(x => x.name === data.name);
    let event;
    if (!execution) {
      event = StateMachineWatchDog.Events.Execution.Status.NewAdded;
      execution = new StateMachineExecution(data);
      await execution.prefetch(this.localCache);
      execution.createListItem();
      this.executions.push(execution);
    } else if (execution.update(data)) {
      event = StateMachineWatchDog.Events.Execution.Status.Changed;
      await execution.prefetch(this.localCache);
      execution.updateListItem();
    }
    if (event) {
      this.eventSource.trigger(event, [execution]);
    }
    return execution;
  }

  checkExecutionRemoval(data = []) {
    const removedList = this.executions.filter(execution =>
      data.findIndex(x0 =>
        execution === x0.name) < 0).filter(x => x);
    while (removedList.length) {
      const removed = removedList.shift();
      const idx = this.executions.findIndex(x =>
        x.name === removed.name);
      if (idx >= 0) {
        this.executions.splice(idx, 1);
        this.eventSource.trigger(StateMachineWatchDog.Events.Execution.Status.Removed, [removed]);
      }
    }
  }

  async startNewProject(data) {
    const response = await ApiHelper.startNewProject({
      input: {
        ...data,
      },
      output: {},
    }, {
      stateMachine: this.name,
    });
    return this.updateExecution(response);
  }

  async startAnalysis(data) {
    const response = await ApiHelper.startAnalysis({
      input: {
        ...data,
      },
      output: {},
    }, {
      stateMachine: this.name,
    });
    return this.updateExecution(response);
  }

  async describeCustomLabels() {
    return ApiHelper.describeCustomLabels();
  }

  async stopCustomLabels(execution) {
    const projectVersionArn = execution.output.input.projectVersionArn;
    return (!projectVersionArn)
      ? undefined
      : ApiHelper.stopCustomLabels({
        action: 'stop',
        projectVersionArn,
      });
  }

  async startTimer(intervalInSec = 3 * 60) {
    if (!this.timer) {
      await this.getStatus();
      this.timer = setInterval(async () => {
        console.log('StateMachineWatchDog.startTimer: refresing execution status...');
        await this.getStatus();
      }, intervalInSec * 1000);
    }
    return this;
  }

  async stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = undefined;
  }

  filterExecutions(status) {
    return this.executions.filter(model =>
      model.status === status);
  }

  getRunningExecutions() {
    return this.filterExecutions(StateMachineExecution.Status.Running);
  }

  getCompletedExecutions() {
    return this.filterExecutions(StateMachineExecution.Status.Succeeded);
  }

  getErrorExecutions() {
    return this.executions.filter(model =>
      model.status !== StateMachineExecution.Status.Running
      && model.status !== StateMachineExecution.Status.Succeeded);
  }
}
