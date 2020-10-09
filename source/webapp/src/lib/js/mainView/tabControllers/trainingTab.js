// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import Localization from '../../shared/localization.js';
import AppUtils from '../../shared/appUtils.js';
import mxSpinner from '../../mixins/mxSpinner.js';
import BaseTab from './baseTab.js';
import SelectTrainOptionsSlideComponent from './training/selectTrainOptionsSlideComponent.js';
import PrepareDatasetSlideComponent from './training/prepareDatasetSlideComponent.js';
import ViewHistorySlideComponent from './training/viewHistorySlideComponent.js';

export default class TrainingTab extends mxSpinner(BaseTab) {
  constructor(defaultTab = false) {
    super(Localization.Messages.TrainingTab, {
      selected: defaultTab,
    });

    this.$ids = {
      ...super.ids,
      carousel: {
        container: `training-${AppUtils.randomHexstring()}`,
      },
    };

    this.$selectTrainOptionComponent = new SelectTrainOptionsSlideComponent();
    this.$prepareDatasetComponent = new PrepareDatasetSlideComponent();
    this.$viewHistoryComponent = new ViewHistorySlideComponent();
  }

  static get Sections() {
    return {
      ProcessingList: 'training-in-process',
      CompletedList: 'training-completed',
    };
  }

  static get Events() {
    return {
      Tab: {
        Switch: {
          LabelingTeam: 'tab:switch:labelingteam',
        },
      },
    };
  }

  get ids() {
    return this.$ids;
  }

  get selectTrainOptionComponent() {
    return this.$selectTrainOptionComponent;
  }

  get prepareDatasetComponent() {
    return this.$prepareDatasetComponent;
  }

  get viewHistoryComponent() {
    return this.$viewHistoryComponent;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    const carousel = await this.createCarousel();
    const row = $('<div/>').addClass('row no-gutters')
      .append(carousel)
      .append(this.createLoading());
    this.tabContent.append(row);
    await this.selectTrainOptionComponent.show();
    return super.show();
  }

  async createCarousel() {
    // routing logic
    const select = this.selectTrainOptionComponent.getSlide();
    select.on(SelectTrainOptionsSlideComponent.Events.Slide.Control.TrainWithBoundingBox, async (event, dataset) => {
      await this.prepareDatasetComponent.setData('object');
      return this.slideTo(this.prepareDatasetComponent.slideId);
    });
    select.on(SelectTrainOptionsSlideComponent.Events.Slide.Control.TrainWithConcept, async (event, dataset) => {
      await this.prepareDatasetComponent.setData('concept');
      return this.slideTo(this.prepareDatasetComponent.slideId);
    });
    select.on(SelectTrainOptionsSlideComponent.Events.Slide.Control.TrainViewHistory, async (event, dataset) =>
      this.slideTo(this.viewHistoryComponent.slideId));
    select.on(SelectTrainOptionsSlideComponent.Events.Slide.SwitchTab.LabelingTeam, async (event, dataset) =>
      this.eventSource.trigger(TrainingTab.Events.Tab.Switch.LabelingTeam));

    const prepare = this.prepareDatasetComponent.getSlide();
    prepare.on(PrepareDatasetSlideComponent.Events.Slide.Control.Startover, async () =>
      this.slideToStartover());
    prepare.on(PrepareDatasetSlideComponent.Events.Slide.Control.Done, async (event, dataset) =>
      this.slideTo(this.viewHistoryComponent.slideId));

    const history = this.viewHistoryComponent.getSlide();
    history.on(ViewHistorySlideComponent.Events.Slide.Control.Done, async () =>
      this.slideToStartover());

    const slides = [
      {
        id: this.selectTrainOptionComponent.slideId,
        el: select,
      },
      {
        id: this.prepareDatasetComponent.slideId,
        el: prepare,
      },
      {
        id: this.viewHistoryComponent.slideId,
        el: history,
      },
    ];
    const inner = $('<div/>').addClass('carousel-inner');
    for (let i = 0; i < slides.length; i++) {
      const classes = (i === 0) ? 'carousel-item active' : 'carousel-item';
      inner.append($('<div/>').addClass(classes)
        .attr('id', slides[i].id)
        .append(slides[i].el));
    }
    const carousel = $('<div/>').addClass('carousel slide w-100')
      .attr('data-ride', false)
      .attr('data-interval', false)
      .attr('id', this.ids.carousel.container)
      .append(inner);
    carousel.on('slide.bs.carousel', async (event) => {
      if (event.from === this.viewHistoryComponent.slide.parent().index()) {
        this.viewHistoryComponent.beforeHide();
      }
      const id = $(event.relatedTarget).prop('id');
      if (id === this.selectTrainOptionComponent.slideId) {
        return this.selectTrainOptionComponent.show();
      }
      if (id === this.prepareDatasetComponent.slideId) {
        return this.prepareDatasetComponent.show();
      }
      if (id === this.viewHistoryComponent.slideId) {
        return this.viewHistoryComponent.show();
      }
      return undefined;
    });
    return carousel;
  }

  slideTo(id) {
    const carousel = this.tabContent.find(`#${this.ids.carousel.container}`).first();
    const idx = carousel.find(`#${id}`).index();
    carousel.carousel(idx);
  }

  slideToStartover() {
    this.clearData();
    return this.slideTo(this.selectTrainOptionComponent.slideId);
  }

  clearData() {
    this.viewHistoryComponent.clearData();
    this.prepareDatasetComponent.clearData();
    this.selectTrainOptionComponent.clearData();
  }
}
