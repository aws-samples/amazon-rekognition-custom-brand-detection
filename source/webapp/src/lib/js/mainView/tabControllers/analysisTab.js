// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import Localization from '../../shared/localization.js';
import AppUtils from '../../shared/appUtils.js';
import mxSpinner from '../../mixins/mxSpinner.js';
import BaseTab from './baseTab.js';
import ViewAnalysisHistorySlideComponent from './analysis/viewAnalysisHistorySlideComponent.js';
import StartAnalysisSlideComponent from './analysis/startAnalysisSlideComponent.js';
import VideoPreviewSlideComponent from './analysis/videoPreviewSlideComponent.js';
import ImagePreviewSlideComponent from './analysis/imagePreviewSlideComponent.js';

export default class AnalysisTab extends mxSpinner(BaseTab) {
  constructor(defaultTab = false) {
    super(Localization.Messages.AnalysisTab, {
      selected: defaultTab,
    });

    this.$ids = {
      ...super.ids,
      carousel: {
        container: `analysis-${AppUtils.randomHexstring()}`,
      },
    };

    this.$viewHistoryComponent = new ViewAnalysisHistorySlideComponent();
    this.$startAnalysisComponent = new StartAnalysisSlideComponent();
    this.$videoPreviewComponent = new VideoPreviewSlideComponent();
    this.$imagePreviewComponent = new ImagePreviewSlideComponent();
  }

  get ids() {
    return this.$ids;
  }

  get viewHistoryComponent() {
    return this.$viewHistoryComponent;
  }

  get startAnalysisComponent() {
    return this.$startAnalysisComponent;
  }

  get videoPreviewComponent() {
    return this.$videoPreviewComponent;
  }

  get imagePreviewComponent() {
    return this.$imagePreviewComponent;
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
    await this.viewHistoryComponent.show();
    return super.show();
  }

  async createCarousel() {
    // routing logic
    const history = this.viewHistoryComponent.getSlide();
    history.on(ViewAnalysisHistorySlideComponent.Events.Slide.Control.NewAnalysis, async () =>
      this.slideTo(this.startAnalysisComponent.slideId));
    history.on(ViewAnalysisHistorySlideComponent.Events.Slide.Media.Selected, async (event, selected) => {
      this.loading(true);
      const preview = (selected.isImage())
        ? this.imagePreviewComponent
        : this.videoPreviewComponent;
      await preview.refresh(selected);
      this.loading(false);
      return this.slideTo(preview.slideId);
    });

    const analysis = this.startAnalysisComponent.getSlide();
    analysis.on(StartAnalysisSlideComponent.Events.Slide.Control.Back, async () =>
      this.slideTo(this.viewHistoryComponent.slideId));
    analysis.on(StartAnalysisSlideComponent.Events.Slide.Control.Done, async () =>
      this.slideToStartover());

    const videoPreview = this.videoPreviewComponent.getSlide();
    videoPreview.on(VideoPreviewSlideComponent.Events.Slide.Control.Close, async () =>
      this.slideTo(this.viewHistoryComponent.slideId));

    const imagePreview = this.imagePreviewComponent.getSlide();
    imagePreview.on(ImagePreviewSlideComponent.Events.Slide.Control.Close, async () =>
      this.slideTo(this.viewHistoryComponent.slideId));

    const slides = [
      {
        id: this.viewHistoryComponent.slideId,
        el: history,
      },
      {
        id: this.startAnalysisComponent.slideId,
        el: analysis,
      },
      {
        id: this.videoPreviewComponent.slideId,
        el: videoPreview,
      },
      {
        id: this.imagePreviewComponent.slideId,
        el: imagePreview,
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
      if (id === this.viewHistoryComponent.slideId) {
        return this.viewHistoryComponent.show();
      }
      if (id === this.startAnalysisComponent.slideId) {
        return this.startAnalysisComponent.show();
      }
      if (id === this.videoPreviewComponent.slideId) {
        return this.videoPreviewComponent.show();
      }
      if (id === this.imagePreviewComponent.slideId) {
        return this.imagePreviewComponent.show();
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

  async slideToStartover() {
    this.clearData();
    return this.slideTo(this.viewHistoryComponent.slideId);
  }

  clearData() {
    this.viewHistoryComponent.clearData();
    this.startAnalysisComponent.clearData();
    this.videoPreviewComponent.clearData();
    this.imagePreviewComponent.clearData();
  }
}
