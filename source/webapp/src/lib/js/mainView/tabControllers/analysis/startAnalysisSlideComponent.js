// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import LocalCache from '../../../shared/localCache.js';
import StateMachineWatchDog from '../../../shared/stateMachineWatchDog.js';
import mxReadable from '../../../mixins/mxReadable.js';
import mxDropzone from '../../../mixins/mxDropzone.js';
import BaseSlideComponent from '../baseSlideComponent.js';
import AppUtils from '../../../shared/appUtils.js';

const MAX_INFERENCE_UNITS = 5;

export default class StartAnalysisSlideComponent extends mxReadable(mxDropzone(BaseSlideComponent)) {
  constructor() {
    super();
    this.$ids = {
      ...this.$ids,
      projectName: `attr-${AppUtils.randomHexstring()}`,
      labelsForm: `attr-${AppUtils.randomHexstring()}`,
    };

    const name = SolutionManifest.StateMachine.Analysis.Name;
    this.$stateMachineWatchDog = StateMachineWatchDog.getSingleton(name);
    this.slide.append(this.createLoading());
    this.$localCache = LocalCache.getSingleton();
    this.$trainingType = undefined;
    this.$fileList = [];
    this.$projectName = undefined;
    this.$labelList = [];
    this.$dataset = [];
    this.$models = [];
  }

  static get Labels() {
    return {
      Max: 250,
    };
  }

  static get Sections() {
    return {
      Upload: 'upload-list',
      Analyzing: 'analyzing-list',
      MostRecent: 'most-recent-list',
    };
  }

  static get Constants() {
    return {
      Select: {
        DataType: {
          Project: 'project',
          Version: 'version',
          Inference: 'inference',
        },
      },
    };
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          Back: 'prepare:slide:control:back',
          Done: 'prepare:slide:control:done',
        },
      },
    };
  }

  static get SupportedFileExtensions() {
    return [
      '.mp4',
      '.m4v',
      '.mov',
      '.jpg',
      '.png',
    ];
  }

  get stateMachineWatchDog() {
    return this.$stateMachineWatchDog;
  }

  get localCache() {
    return this.$localCache;
  }

  get trainingType() {
    return this.$trainingType;
  }

  set trainingType(val) {
    this.$trainingType = val;
  }

  async setData(val) {
    this.trainingType = val;
  }

  get fileList() {
    return this.$fileList;
  }

  get projectName() {
    return this.$projectName;
  }

  set projectName(val) {
    this.$projectName = val;
  }

  get labelList() {
    return this.$labelList;
  }

  set labelList(val) {
    this.$labelList = val.slice(0);
  }

  get dataset() {
    return this.$dataset;
  }

  set dataset(val) {
    this.$dataset = val.slice(0);
  }

  get models() {
    return this.$models;
  }

  set models(val) {
    this.$models = val.slice(0);
  }

  // override BaseSlideComponent
  saveData() {
    return this;
  }

  // override BaseSlideComponent
  getData() {
    return {
      projectName: this.projectName,
      labels: this.labelList.slice(0),
      keys: this.dataset.slice(0),
    };
  }

  // override BaseSlideComponent
  clearData() {
    this.slide.find(`.${StartAnalysisSlideComponent.Sections.Upload}`)
      .find('.list-group').children().remove();
    this.fileList.length = 0;
    this.dataset.length = 0;

    this.slide.find(`#${this.ids.labelsForm}`).children('.input-group').remove();
    this.labelList.length = 0;

    this.slide.find(`#${this.ids.projectName}`).val('');
    this.projectName = '';
  }

  async refresh() {
    return this;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    this.models = await this.describeCustomLabels();

    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.StartAnalysisDesc);
    const projectSelection = this.createProjectSelection();
    const dropzoneDesc = this.createDropzoneDesc();
    const dropzone = this.createDropzone(Localization.Messages.DropFilesHere);
    const uploadSection = this.createUploadSection();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(description))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(projectSelection))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(dropzoneDesc))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(dropzone))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(uploadSection)))
      .append(this.createLoading());

    this.slide.append(row);
    return super.show();
  }

  createProjectSelection() {
    const title = $('<span/>').addClass('d-block p-0 bg-light text-black lead')
      .html(Localization.Messages.ProjectVersionName);
    const desc = $('<p/>').addClass('mt-2')
      .html(Localization.Messages.ProjectVersionDesc);

    const [
      projectSelect,
      projectForm,
    ] = this.createFormItem(
      Localization.Messages.ProjectName,
      StartAnalysisSlideComponent.Constants.Select.DataType.Project
    );
    const [
      versionSelect,
      versionForm,
    ] = this.createFormItem(
      Localization.Messages.SpecifyProjectVersion,
      StartAnalysisSlideComponent.Constants.Select.DataType.Version
    );
    const [
      inferenceSelect,
      inferenceForm,
    ] = this.createFormItem(
      Localization.Messages.SpecifyInferenceUnits,
      StartAnalysisSlideComponent.Constants.Select.DataType.Inference
    );

    // projects
    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      const option = $('<option/>')
        .attr('value', model.projectArn)
        .append(model.name);
      if (i === 0) {
        option.attr('selected', true);
      }
      projectSelect.append(option);
    }
    // versions
    if (this.models.length) {
      for (let i = 0; i < this.models[0].versions.length; i++) {
        const version = this.models[0].versions[i];
        const option = $('<option/>')
          .attr('value', version.projectVersionArn)
          .append(version.name);
        if (i === 0) {
          option.attr('selected', true);
        }
        versionSelect.append(option);
      }
    } else {
      versionSelect.attr('disabled', true);
    }
    // inference units
    for (let i = 0; i < MAX_INFERENCE_UNITS; i++) {
      const option = $('<option/>')
        .attr('value', i + 1)
        .append(i + 1);
      if (i === 0) {
        option.attr('selected', true);
      }
      inferenceSelect.append(option);
    }

    projectSelect.change(async () => {
      const projectArn = projectSelect.find('option:selected').first().val();
      const matched = this.models.find(x => x.projectArn === projectArn);
      if (!matched) {
        await this.showAlert(`fail to find the selected project name, ${projectArn}`);
        return undefined;
      }
      versionSelect.children().remove();
      for (let i = 0; i < matched.versions.length; i++) {
        const version = matched.versions[i];
        const option = $('<option/>')
          .attr('value', version.projectVersionArn)
          .append(version.name);
        if (i === 0) {
          option.attr('selected', true);
        }
        versionSelect.append(option);
      }
      versionForm.removeAttr('disabled');
      return name;
    });

    return $('<div/>').addClass('mt-0')
      .append(title)
      .append(desc)
      .append(projectForm)
      .append(versionForm)
      .append(inferenceForm);
  }

  createFormItem(name, type, url) {
    const id = AppUtils.randomHexstring();
    const select = $('<select/>').addClass('custom-select')
      .attr('id', id)
      .attr('data-type', type);
    const form = $('<div/>').addClass('form-group row')
      .append($('<div/>').addClass('input-group col-8 d-flex mx-auto my-2')
        .append($('<div/>').addClass('input-group-prepend')
          .append($('<label/>').addClass('input-group-text')
            .attr('for', id)
            .append(name)))
        .append(select));
    if (url) {
      form.append($('<div/>').addClass('col-3 p-0 m-0 d-flex my-auto')
        .append($('<a/>').addClass('btn btn-sm btn-link')
          .attr('href', url)
          .attr('target', '_blank')
          .append(Localization.Tooltips.ViewOnAWSConsole)));
    }
    return [
      select,
      form,
    ];
  }

  createDropzoneDesc() {
    const title = $('<span/>').addClass('d-block p-0 bg-light text-black lead')
      .html(Localization.Messages.MediaFiles);
    const desc = $('<p/>').addClass('mt-2')
      .html(Localization.Messages.MediaFilesDesc);

    return $('<div/>').addClass('mt-4')
      .append(title)
      .append(desc);
  }

  createUploadSection() {
    const details = $('<details/>').addClass(`my-2 ${StartAnalysisSlideComponent.Sections.Upload}`)
      .addClass('collapse')
      .append($('<summary/>').addClass('mb-2')
        .append(Localization.Messages.FilesReadyToUpload));
    const ul = $('<ul/>').addClass('list-group');

    const back = $('<button/>').addClass('btn btn-sm btn-primary ml-1')
      .attr('data-action', 'back')
      .html(Localization.Buttons.Back);

    const startNow = $('<button/>').addClass('btn btn-sm btn-success ml-1')
      .attr('data-action', 'start-analysis')
      .html(Localization.Buttons.StartNow);

    const done = $('<button/>').addClass('btn btn-sm btn-secondary ml-1')
      .attr('disabled', '')
      .attr('data-action', 'done')
      .html(Localization.Buttons.Done);

    const controls = $('<form/>').addClass('form-inline mt-4')
      .append($('<div/>').addClass('ml-auto my-auto')
        .append(back)
        .append(startNow)
        .append(done));

    back.on('click', async (event) =>
      this.slide.trigger(StartAnalysisSlideComponent.Events.Slide.Control.Back));

    startNow.on('click', async (event) => {
      let type = StartAnalysisSlideComponent.Constants.Select.DataType.Project;
      const projectArn = this.slide.find(`select[data-type="${type}"]`).first().val();

      type = StartAnalysisSlideComponent.Constants.Select.DataType.Version;
      const projectVersionArn = this.slide.find(`select[data-type="${type}"]`).first().val();

      type = StartAnalysisSlideComponent.Constants.Select.DataType.Inference;
      let inferenceUnits = this.slide.find(`select[data-type="${type}"]`).first().val();
      inferenceUnits = Number.parseInt(inferenceUnits || 1, 10);

      const kids = ul.children();
      if (!kids.length) {
        this.shake(controls);
        return this.showAlert(Localization.Alerts.NoDataset);
      }
      if (!projectArn) {
        this.shake(controls);
        return this.showAlert(Localization.Alerts.ProjectNameNotSelected);
      }
      if (!projectVersionArn) {
        this.shake(controls);
        return this.showAlert(Localization.Alerts.ProjectVersionNotSelected);
      }

      startNow.attr('disabled', '');
      for (let i = 0; i < kids.length; i++) {
        const item = $(kids[i]);
        const fileId = item.data('fileId');
        const spinner = item.find('.spinner-grow');
        spinner.removeClass('collapse');
        try {
          const file = this.fileList.find(x => x.fileId === fileId);
          if (!file) {
            throw new Error(`${item.data('displayName')} not found`);
          }
          await file.upload();
          await this.startAnalysis(projectArn, projectVersionArn, inferenceUnits, file.key);
          item.addClass('list-group-item-success');
        } catch (e) {
          item.addClass('list-group-item-danger');
          item.find('.badge').prop('title', e.message).removeClass('collapse');
        } finally {
          spinner.addClass('collapse');
        }
      }
      return done.removeAttr('disabled');
    });

    done.on('click', async (event) => {
      this.clearData();
      done.attr('disabled', '');
      startNow.removeAttr('disabled');
      details.removeAttr('open').addClass('collapse');
      return this.slide.trigger(StartAnalysisSlideComponent.Events.Slide.Control.Done);
    });

    controls.submit((event) =>
      event.preventDefault());

    return $('<div/>')
      .append(details.append(ul))
      .append(controls);
  }

  canSupport(file) {
    if (!file) {
      return false;
    }
    if (typeof file === 'string') {
      const ext = file.substring(file.lastIndexOf('.'), file.length).toLowerCase();
      return StartAnalysisSlideComponent.SupportedFileExtensions.indexOf(ext) >= 0;
    }
    const mime = (file || {}).type || (file || {}).mime;
    if (mime) {
      return [
        'video',
        'image',
      ].indexOf(mime.split('/')[0]) >= 0;
    }
    return this.canSupport((file || {}).name || (file || {}).key);
  }

  async processDropEvent(event) {
    this.slide.find(`.${StartAnalysisSlideComponent.Sections.Upload}`)
      .removeClass('collapse').attr('open', '');
    return super.processDropEvent(event);
  }

  async processEachFileItem(file) {
    this.fileList.push(file);
    const item = await file.createItem();
    this.slide.find(`.${StartAnalysisSlideComponent.Sections.Upload}`)
      .find('.list-group').append(item);
    return item;
  }

  async startAnalysis(projectArn, projectVersionArn, inferenceUnits, key) {
    return this.stateMachineWatchDog.startAnalysis({
      bucket: SolutionManifest.S3.Bucket,
      key,
      projectArn,
      projectVersionArn,
      inferenceUnits,
    });
  }

  async describeCustomLabels() {
    return this.stateMachineWatchDog.describeCustomLabels();
  }
}
