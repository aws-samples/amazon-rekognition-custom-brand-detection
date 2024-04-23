// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import StateMachineWatchDog from '../../../shared/stateMachineWatchDog.js';
import AppUtils from '../../../shared/appUtils.js';
import mxReadable from '../../../mixins/mxReadable.js';
import mxDropzone from '../../../mixins/mxDropzone.js';
import BaseSlideComponent from '../baseSlideComponent.js';

export default class PrepareDatasetSlideComponent extends mxReadable(mxDropzone(BaseSlideComponent)) {
  constructor() {
    super();
    this.$ids = {
      ...this.$ids,
      projectName: `attr-${AppUtils.randomHexstring()}`,
      labelsForm: `attr-${AppUtils.randomHexstring()}`,
    };

    const name = SolutionManifest.StateMachine.Training.Name;
    this.$stateMachineWatchDog = StateMachineWatchDog.getSingleton(name);
    this.slide.append(this.createLoading());
    this.$trainingType = undefined;
    this.$fileList = [];
    this.$projectName = undefined;
    this.$labelList = [];
    this.$dataset = [];
  }

  static get Labels() {
    return {
      Max: 250,
    };
  }

  static get Sections() {
    return {
      Upload: 'upload-list',
    };
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          Done: 'prepare:slide:control:done',
          Startover: 'prepare:slide:control:startover',
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

  // override BaseSlideComponent
  saveData() {
    let projectName = this.slide.find(`#${this.ids.projectName}`).val();
    if (!projectName) {
      projectName = `project-${(new Date()).toISOString().replace(/[:.-]/g, '')}`;
    }
    this.projectName = projectName.toLowerCase();

    this.labelList.length = 0;
    const form = this.slide.find(`#${this.ids.labelsForm}`);
    const inputGrps = form.children('.input-group');
    inputGrps.each((k, inputGrp) => {
      const label = $(inputGrp).find('[data-attr-type="label"]').val();
      if (label) {
        this.labelList.push(label);
      }
    });
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
    this.slide.find(`.${PrepareDatasetSlideComponent.Sections.Upload}`)
      .find('.list-group').children().remove();
    this.fileList.length = 0;
    this.dataset.length = 0;

    this.slide.find(`#${this.ids.labelsForm}`).children('.input-group').remove();
    this.labelList.length = 0;

    this.slide.find(`#${this.ids.projectName}`).val('');
    this.projectName = '';
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.PrepareDatasetDesc);

    const project = this.createProjectName();
    const labels = this.createLabels();
    const attrGroup = $('<div/>').addClass('attr-group')
      .addClass('overflow-auto my-auto align-content-start')
      .append(project)
      .append(labels);

    const dropzoneDesc = this.createDropzoneDesc();
    const dropzone = this.createDropzone(Localization.Messages.DropFilesHere);

    const uploadSection = this.createUploadSection();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(description))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(attrGroup))
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

  createProjectName() {
    const title = $('<span/>').addClass('d-block p-0 bg-light text-black lead')
      .html('Project Name');
    const desc = $('<p/>').addClass('mt-2')
      .html(Localization.Messages.ProjectNameDesc);
    const name = $('<input/>').addClass('form-control mr-2')
      .attr('id', this.ids.projectName)
      .attr('pattern', '^[a-zA-Z0-9-]{0,}$')
      .attr('placeholder', '(Blank)');
    const form = $('<form/>').addClass('col-4 px-0 needs-validation')
      .attr('novalidate', 'novalidate')
      .append($('<label/>').addClass('mr-2 sr-only')
        .attr('for', this.ids.projectName)
        .html(Localization.Messages.ProjectName))
      .append(name);

    name.focusout(async (event) => {
      if (!this.validateForm(event, form)) {
        this.shake(form);
        await this.showAlert(Localization.Alerts.InvalidProjectName);
        name.focus();
        return false;
      }
      return true;
    });

    name.keypress(async (event) => {
      if (event.which === 13) {
        if (!this.validateForm(event, form)) {
          this.shake(form);
          await this.showAlert(Localization.Alerts.InvalidProjectName);
          name.focus();
          return false;
        }
      }
      return true;
    });

    return $('<div/>').addClass('mt-0')
      .append(title)
      .append(desc)
      .append(form);
  }

  createLabels() {
    const title = $('<span/>').addClass('d-block p-0 bg-light text-black lead')
      .html(Localization.Messages.Labels);
    const desc = $('<p/>').addClass('mt-2')
      .html(Localization.Messages.LabelsDesc);

    const addBtn = $('<button/>').addClass('btn btn-success mb-2')
      .attr('type', 'button')
      .html(Localization.Buttons.AddLabel);

    const form = $('<form/>').addClass('col-9 px-0 needs-validation')
      .attr('id', this.ids.labelsForm)
      .attr('novalidate', 'novalidate')
      .append(addBtn);

    addBtn.off('click').on('click', async (event) => {
      event.preventDefault();
      if (form.children('.input-group').length >= PrepareDatasetSlideComponent.Labels.Max) {
        event.stopPropagation();
        this.shake(form);
        await this.showAlert(Localization.Alerts.MaxNumOfLabels);
        return false;
      }
      form.append(this.createLabelField());
      return true;
    });

    return $('<div/>').addClass('mt-4')
      .append(title)
      .append(desc)
      .append(form);
  }

  createLabelField() {
    const inputGrp = $('<div/>').addClass('input-group mb-2 mr-sm-2');
    const label = $('<input/>').addClass('form-control col-3')
      .attr('data-attr-type', 'label')
      .attr('type', 'text')
      .attr('placeholder', '(Label)')
      .attr('pattern', '^[a-zA-Z0-9 _-]{0,16}$');
    const removeBtn = $('<button/>').addClass('btn btn-secondary ml-1')
      .append($('<i/>').addClass('far fa-times-circle'));

    removeBtn.off('click').on('click', (event) => {
      event.preventDefault();
      inputGrp.remove();
    });

    [
      label,
    ].forEach((x) => {
      x.focusout(async (event) => {
        const form = inputGrp.parent('form').first();
        if (!this.validateForm(event, form) && !x[0].validity.valid) {
          this.shake(form);
          await this.showAlert(Localization.Alerts.InvalidLabel);
          x.focus();
          return false;
        }
        return true;
      });

      x.keypress(async (event) => {
        if (event.which === 13) {
          const form = inputGrp.parent('form').first();
          if (!this.validateForm(event, form) && !x[0].validity.valid) {
            this.shake(form);
            await this.showAlert(Localization.Alerts.InvalidLabel);
            x.focus();
            return false;
          }
        }
        return true;
      });
    });

    inputGrp
      .append(label)
      .append(removeBtn);
    return inputGrp;
  }

  validateForm(event, form) {
    event.preventDefault();
    if (form[0].checkValidity() === false) {
      event.stopPropagation();
      return false;
    }
    return true;
  }

  createDropzoneDesc() {
    const title = $('<span/>').addClass('d-block p-0 bg-light text-black lead')
      .html(Localization.Messages.Dataset);
    const desc = $('<p/>').addClass('mt-2')
      .html(Localization.Messages.DatasetDesc);

    return $('<div/>').addClass('mt-4')
      .append(title)
      .append(desc);
  }

  createUploadSection() {
    const details = $('<details/>').addClass(`my-2 ${PrepareDatasetSlideComponent.Sections.Upload}`)
      .addClass('collapse')
      .append($('<summary/>').addClass('mb-2')
        .append(Localization.Messages.FilesReadyToUpload));
    const ul = $('<ul/>').addClass('list-group');

    const btnStartover = $('<button/>').addClass('btn btn-sm btn-light ml-1')
      .attr('data-action', 'startover')
      .html(Localization.Buttons.Startover);

    const btnCreate = $('<button/>').addClass('btn btn-sm btn-success ml-1')
      .attr('data-action', 'create-project')
      .html(Localization.Buttons.CreateProject);

    const btnDone = $('<button/>').addClass('btn btn-sm btn-secondary ml-1')
      .attr('disabled', '')
      .attr('data-action', 'done')
      .html(Localization.Buttons.Done);

    const controls = $('<form/>').addClass('form-inline mt-4')
      .append($('<div/>').addClass('ml-auto my-auto')
        .append(btnStartover)
        .append(btnCreate)
        .append(btnDone));

    btnStartover.on('click', async (event) =>
      this.slide.trigger(PrepareDatasetSlideComponent.Events.Slide.Control.Startover));

    btnCreate.on('click', async (event) => {
      this.saveData();

      const kids = ul.children();
      if (!kids.length) {
        this.shake(controls);
        return this.showAlert(Localization.Alerts.NoDataset);
      }
      if (!this.labelList.length) {
        this.shake(controls);
        return this.showAlert(Localization.Alerts.NoLabel);
      }

      btnCreate.attr('disabled', '');

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
          file.key = `${this.projectName}/${file.key}`;
          await file.upload();
          this.dataset.push(file.key);
          item.addClass('list-group-item-success');
        } catch (e) {
          item.addClass('list-group-item-danger');
          item.find('.badge').prop('title', e.message).removeClass('collapse');
        } finally {
          spinner.addClass('collapse');
        }
      }
      const response = await this.startNewProject().catch(e => e);
      if (response instanceof Error) {
        this.shake(controls);
        const message = Localization.Alerts.StartNewProjectError.replace('{{PROJECT_NAME}}', this.projectName);
        await this.showAlert(message);
      } else {
        const message = Localization.Alerts.StartNewProjectSucceed.replace('{{PROJECT_NAME}}', this.projectName);
        await this.showSuccess(message);
      }
      return btnDone.removeAttr('disabled');
    });

    btnDone.on('click', async (event) => {
      this.clearData();
      btnDone.attr('disabled', '');
      btnCreate.removeAttr('disabled');
      details.removeAttr('open').addClass('collapse');
      return this.slide.trigger(PrepareDatasetSlideComponent.Events.Slide.Control.Done);
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
      return PrepareDatasetSlideComponent.SupportedFileExtensions.indexOf(ext) >= 0;
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
    this.slide.find(`.${PrepareDatasetSlideComponent.Sections.Upload}`)
      .removeClass('collapse').attr('open', '');
    return super.processDropEvent(event);
  }

  async processEachFileItem(file) {
    this.fileList.push(file);
    const item = await file.createItem();
    this.slide.find(`.${PrepareDatasetSlideComponent.Sections.Upload}`)
      .find('.list-group').append(item);
    return item;
  }

  async startNewProject() {
    return this.stateMachineWatchDog.startNewProject({
      bucket: SolutionManifest.S3.Bucket,
      keys: this.dataset,
      projectName: this.projectName,
      labels: this.labelList,
      trainingType: this.trainingType,
    });
  }
}
