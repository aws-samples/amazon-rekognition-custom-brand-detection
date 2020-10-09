// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import BaseSlideComponent from '../baseSlideComponent.js';
import StateMachineWatchDog, {
  StateMachineExecution,
} from '../../../shared/stateMachineWatchDog.js';

export default class ViewHistorySlideComponent extends BaseSlideComponent {
  constructor() {
    super();
    const name = SolutionManifest.StateMachine.Training.Name;
    this.$stateMachineWatchDog = StateMachineWatchDog.getSingleton(name);
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          Done: 'history:slide:control:done',
        },
      },
    };
  }

  static get Sections() {
    return {
      Processing: 'processing-list',
      Completed: 'completed-list',
      Failed: 'failed-list',
    };
  }

  get stateMachineWatchDog() {
    return this.$stateMachineWatchDog;
  }

  async show() {
    await this.stateMachineWatchDog.startTimer();
    if (this.initialized) {
      return super.show();
    }

    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.ViewStateMachineHistory);

    const processing = this.createProcessingList();
    const completed = this.createCompletedList();
    const failed = this.createFailedList();
    const controls = this.createControls();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(description)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(processing)))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(completed)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(failed)))
      .append($('<div/>').addClass('col-12 p-0 m-0 mt-4')
        .append($('<div/>').addClass('col-9 p-0 m-2 mx-auto')
          .append(controls)));

    this.slide.append(row);
    await this.executionChangedEvent();
    return super.show();
  }

  async beforeHide() {
    return this.stateMachineWatchDog.stopTimer();
  }

  createProcessingList() {
    const title = $('<span/>').addClass('d-block p-0 bg-light text-black lead')
      .html(Localization.Messages.TrainingInProcess);
    const desc = $('<p/>').addClass('mt-2')
      .html(Localization.Messages.TrainingInProcessDesc);

    const details = $('<details/>').addClass(`my-2 ${ViewHistorySlideComponent.Sections.Processing}`)
      .attr('open', '')
      .append($('<summary/>').addClass('mb-2')
        .append(Localization.Messages.ListOfExecutions));
    const ul = $('<ul/>').addClass('list-group');
    this.stateMachineWatchDog.getRunningExecutions().forEach(x =>
      ul.append(this.createProcessingListItem(x)));

    return $('<div/>').addClass('mt-4')
      .append(title)
      .append(desc)
      .append(details.append(ul));
  }

  createCompletedList() {
    const title = $('<span/>').addClass('d-block p-0 bg-white text-black lead')
      .html(Localization.Messages.TrainingCompleted);
    const desc = $('<p/>').addClass('mt-2')
      .html(Localization.Messages.TrainingCompletedDesc);

    const details = $('<details/>').addClass(`my-2 ${ViewHistorySlideComponent.Sections.Completed}`)
      .attr('open', '')
      .append($('<summary/>').addClass('mb-2')
        .append(Localization.Messages.ListOfExecutions));
    const ul = $('<ul/>').addClass('list-group');
    this.stateMachineWatchDog.getCompletedExecutions().forEach(x =>
      ul.append(this.createCompletedListItem(x)));

    return $('<div/>').addClass('mt-4')
      .append(title)
      .append(desc)
      .append(details.append(ul));
  }

  createFailedList() {
    const title = $('<span/>').addClass('d-block p-0 bg-light text-black lead')
      .html(Localization.Messages.TrainingFailed);
    const desc = $('<p/>').addClass('mt-2')
      .html(Localization.Messages.TrainingFailedDesc);

    const details = $('<details/>').addClass(`my-2 ${ViewHistorySlideComponent.Sections.Failed}`)
      .append($('<summary/>').addClass('mb-2')
        .append(Localization.Messages.ListOfExecutions));
    const ul = $('<ul/>').addClass('list-group');
    this.stateMachineWatchDog.getErrorExecutions().forEach(x =>
      ul.append(this.createFailedListItem(x)));

    return $('<div/>').addClass('mt-4')
      .append(title)
      .append(desc)
      .append(details.append(ul));
  }

  createProcessingListItem(execution) {
    const item = execution.getListItem();
    item.off('click').on('click', async (event) => {
      event.preventDefault();
      this.loading(true);
      await this.stateMachineWatchDog.getStatus(execution);
      this.loading(false);
      return item;
      /*
      const url = execution.getExecutionUrl();
      return (url)
        ? window.open(url, '_blank')
        : undefined;
      */
    });
    return item;
  }

  createCompletedListItem(execution) {
    const item = execution.getListItem();
    item.off('click').on('click', async (event) => {
      event.preventDefault();
      // const url = execution.getExecutionUrl();
      const url = execution.getTrainedModelPerformanceUrl();
      return (url)
        ? window.open(url, '_blank')
        : undefined;
    });
    return item;
  }

  createFailedListItem(execution) {
    const item = execution.getListItem();
    item.off('click').on('click', async (event) => {
      event.preventDefault();
      const url = execution.getExecutionUrl();
      return (url)
        ? window.open(url, '_blank')
        : undefined;
    });
    return item;
  }

  createControls() {
    const row = $('<div/>').addClass('no-gutters');
    const done = $('<button/>').addClass('btn btn-success ml-1')
      .attr('data-control-type', 'back')
      .html(Localization.Buttons.Back);

    done.off('click').on('click', async (event) =>
      this.slide.trigger(ViewHistorySlideComponent.Events.Slide.Control.Done));

    const controls = $('<form/>').addClass('form-inline controls')
      .append($('<div/>').addClass('ml-auto')
        .append(done));

    controls.submit(event =>
      event.preventDefault());

    return row.append(controls);
  }

  async setData(val) {
    return this;
  }

  async executionChangedEvent() {
    this.stateMachineWatchDog.eventSource.on(StateMachineWatchDog.Events.Execution.Status.NewAdded, async (event, execution) =>
      this.addExecutionOption(execution));

    this.stateMachineWatchDog.eventSource.on(StateMachineWatchDog.Events.Execution.Status.Changed, async (event, execution) =>
      this.updateExecutionOption(execution));

    this.stateMachineWatchDog.eventSource.on(StateMachineWatchDog.Events.Execution.Status.Removed, async (event, execution) =>
      this.removeExecutionOption(execution));
  }

  getListGroupByStatus(status) {
    const id = (status === StateMachineExecution.Status.Running)
      ? ViewHistorySlideComponent.Sections.Processing
      : (status === StateMachineExecution.Status.Succeeded)
        ? ViewHistorySlideComponent.Sections.Completed
        : ViewHistorySlideComponent.Sections.Failed;
    return this.slide.find(`.${id}`).find('.list-group');
  }

  async addExecutionOption(execution, parent) {
    console.log(`addExecutionOption: ${execution.name}`);
    const group = parent || this.getListGroupByStatus(execution.status);
    group.closest('details').attr('open', '');
    const kids = group.children();
    for (let i = 0; i < kids.length; i++) {
      const kid = $(kids[i]);
      if (kid.data('execution') === execution.name) {
        return kid;
      }
    }
    const item = (execution.status === StateMachineExecution.Status.Completed)
      ? this.createCompletedListItem(execution)
      : (execution.status === StateMachineExecution.Status.Running)
        ? this.createProcessingListItem(execution)
        : undefined;
    if (item) {
      group.prepend(item);
    }
    return item;
  }

  async updateExecutionOption(execution, parent) {
    console.log(`updateExecutionOption: ${execution.name}`);
    const running = this.getListGroupByStatus(StateMachineExecution.Status.Running).children();
    if (execution.status !== StateMachineExecution.Status.Running) {
      for (let i = 0; i < running.length; i++) {
        const item = $(running[i]);
        if (item.data('execution') === execution.name) {
          // move item from Running to Completed
          const detached = item.detach();
          if (execution.status === StateMachineExecution.Status.Succeeded) {
            detached.off('click').on('click', async (event) => {
              event.preventDefault();
              const url = execution.getTrainedModelPerformanceUrl();
              return (url)
                ? window.open(url, '_blank')
                : undefined;
            });
          } else {
            detached.off('click').on('click', async (event) => {
              event.preventDefault();
              return window.open(execution.getExecutionUrl(), '_blank');
            });
          }
          const toGroup = this.getListGroupByStatus(StateMachineExecution.Status.Succeeded);
          toGroup.prepend(detached);
          toGroup.closest('details').attr('open', '');
          return detached;
        }
      }
    }
    return undefined;
  }

  async removeExecutionOption(execution, parent) {
    console.log(`removeExecutionOption: ${execution.name}`);
    return undefined;
  }

  async refresh() {
    return this.stateMachineWatchDog.getStatus();
  }
}
