// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import ApiHelper from '../../../shared/apiHelper.js';
import LocalCache from '../../../shared/localCache.js';
import QuestionModal from './questionModal.js';
import BaseSlideComponent from '../baseSlideComponent.js';

export default class SelectTrainOptionsSlideComponent extends BaseSlideComponent {
  constructor() {
    super();
    this.$selectedFlow = undefined;
    this.$localCache = LocalCache.getSingleton();
  }

  get selectedFlow() {
    return this.$selectedFlow;
  }

  set selectedFlow(val) {
    this.$selectedFlow = val;
  }

  get localCache() {
    return this.$localCache;
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          TrainWithBoundingBox: 'select:slide:control:trainwithboundingbox',
          TrainWithConcept: 'select:slide:control:trainwithconcept',
          TrainViewHistory: 'select:slide:control:trainhistory',
        },
        SwitchTab: {
          LabelingTeam: 'slide:switchtab:labelingteam',
        },
      },
    };
  }

  static get Samples() {
    return {
      BoundingBox: [
        'pexels-boundingbox-0001.jpg',
        'pexels-boundingbox-0002.jpg',
        'pexels-boundingbox-0003.jpg',
        'pexels-boundingbox-0004.jpg',
        'pexels-boundingbox-0005.jpg',
        'pexels-boundingbox-0006.jpg',
        'pexels-boundingbox-0007.jpg',
        'pexels-boundingbox-0008.jpg',
      ],
      Concept: [
        'pexels-concept-0001.jpg',
        'pexels-concept-0002.jpg',
        'pexels-concept-0003.jpg',
        'pexels-concept-0004.jpg',
        'pexels-concept-0005.jpg',
        'pexels-concept-0006.jpg',
        'pexels-concept-0007.jpg',
        'pexels-concept-0008.jpg',
      ],
    };
  }

  static getBoundingBoxImageUrl(id) {
    return `/images/option-1/${id}`;
  }

  static getConceptImageUrl(id) {
    return `/images/option-2/${id}`;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.SelectTrainingOptionsDesc);

    const trainWithBoundingBox = await this.createTrainingOptionWithBoundingBox();
    const trainWithConcept = await this.createTrainningOptionWithConcept();
    const trainHistory = await this.createTrainningOptionViewHistory();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(description)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(trainWithBoundingBox)))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(trainWithConcept)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(trainHistory)));

    this.slide.append(row);
    this.checkTeamMemberSettings();
    return super.show();
  }

  async createTrainingOptionWithBoundingBox() {
    const row = $('<div/>').addClass('row ml-1');
    const col12 = $('<div/>').addClass('col-12 p-0 m-0');

    const description = $('<span/>').addClass('lead-sm')
      .append(Localization.Messages.TrainingOptionWithBoundingBox);

    const samples = $('<div/>').addClass('cards row no-gutters mt-4');
    const images = await Promise.all(SelectTrainOptionsSlideComponent.Samples.BoundingBox.map(x =>
      this.localCache.getImageURL(x, {
        url: SelectTrainOptionsSlideComponent.getBoundingBoxImageUrl(x),
      })));
    images.forEach((url) => {
      const img = $('<img/>').addClass('mr-2 mb-2')
        .attr('src', url)
        .attr('width', 128)
        .attr('height', 128)
        .css('object-fit', 'cover');
      samples.append(img);
    });

    const btn = $('<button/>').addClass('btn btn-success d-flex mx-auto mt-2')
      .append(Localization.Buttons.SelectOption);

    btn.off('click').on('click', () =>
      this.selectFlow(SelectTrainOptionsSlideComponent.Events.Slide.Control.TrainWithBoundingBox));

    return row.append(col12.append(description)
      .append(samples)
      .append(btn));
  }

  async createTrainningOptionWithConcept() {
    const row = $('<div/>').addClass('row ml-1');
    const col12 = $('<div/>').addClass('col-12 p-0 m-0');

    const description = $('<span/>').addClass('lead-sm')
      .append(Localization.Messages.TrainingOptionWithConcept);

    const samples = $('<div/>').addClass('cards row no-gutters mt-4');
    const images = await Promise.all(SelectTrainOptionsSlideComponent.Samples.Concept.map(x =>
      this.localCache.getImageURL(x, {
        url: SelectTrainOptionsSlideComponent.getConceptImageUrl(x),
      })));
    images.forEach((url) => {
      const img = $('<img/>').addClass('mr-2 mb-2')
        .attr('src', url)
        .attr('width', 128)
        .attr('height', 128)
        .css('object-fit', 'cover');
      samples.append(img);
    });

    const btn = $('<button/>').addClass('btn btn-success d-flex mx-auto mt-2')
      // .attr('disabled', '')
      .append(Localization.Buttons.SelectOption);

    btn.off('click').on('click', () =>
      this.selectFlow(SelectTrainOptionsSlideComponent.Events.Slide.Control.TrainWithConcept));

    return row.append(col12.append(description)
      .append(samples)
      .append(btn));
  }

  async createTrainningOptionViewHistory() {
    const row = $('<div/>').addClass('row ml-1');
    const col12 = $('<div/>').addClass('col-12 p-0 m-0');

    const description = $('<span/>').addClass('lead-sm')
      .append(Localization.Messages.TrainingOptionViewHistory);

    const btn = $('<button/>').addClass('btn btn-success d-flex mx-auto mt-4')
      .append(Localization.Buttons.SelectOption);

    btn.off('click').on('click', () =>
      this.selectFlow(SelectTrainOptionsSlideComponent.Events.Slide.Control.TrainViewHistory));

    return row.append(col12.append(description)
      .append(btn));
  }

  checkTeamMemberSettings() {
    return setTimeout(async () => {
      const teamName = SolutionManifest.PrivateWorkforce.TeamName;
      const members = await ApiHelper.getTeamMembers({
        teamName,
      });
      if (!members.length) {
        const modal = new QuestionModal(this, Localization.Messages.ConfigureTeamMember);
        modal.modal.on('hidden.bs.modal', async (event) => {
          const yesno = modal.answer;
          modal.destroy();
          return (yesno)
            ? this.slide.trigger(SelectTrainOptionsSlideComponent.Events.Slide.SwitchTab.LabelingTeam)
            : undefined;
        });
        return modal.show();
      }
      return undefined;
    }, 1000);
  }

  selectFlow(id, data) {
    this.selectedFlow = id;
    return this.slide.trigger(id, [data]);
  }

  clearData() {
    // this.selectFlow = undefined;
    return super.clearData();
  }
}
