import Localization from '../../../shared/localization.js';

export default class QuestionModal {
  constructor(parent, description) {
    this.$parent = parent;
    this.$description = description;
    this.$answer = undefined;
    this.$modal = $('<div/>').addClass('modal fade')
      .attr('tabindex', -1)
      .attr('role', 'dialog')
      .attr('aria-labelledby', 'questionModal')
      .attr('aria-hidden', true)
      .attr('data-backdrop', 'static');
  }

  get parent() {
    return this.$parent;
  }

  get description() {
    return this.$description;
  }

  get answer() {
    return this.$answer;
  }

  set answer(val) {
    this.$answer = val;
  }

  get modal() {
    return this.$modal;
  }

  async show() {
    const dialog = this.createModal();
    this.modal.append(dialog);
    this.parent.getSlide().append(this.modal);
    this.modal.modal('show');
  }

  async destroy() {
    this.modal.remove();
  }

  createModal() {
    const no = $('<button/>').addClass('btn btn-secondary ml-1')
      .html(Localization.Buttons.No);

    const yes = $('<button/>').addClass('btn btn-success ml-1')
      .html(Localization.Buttons.Yes);

    no.off('click').on('click', () => {
      this.answer = false;
      return this.modal.modal('hide');
    });

    yes.off('click').on('click', () => {
      this.answer = true;
      return this.modal.modal('hide');
    });

    const dialog = $('<div/>').addClass('modal-dialog')
      .attr('role', 'document')
      .append($('<div/>').addClass('modal-content')
        .css('border-radius', 0)
        .append($('<div/>').addClass('modal-header')
          .append($('<h5/>').addClass('modal-title')
            .append(Localization.Messages.Reminder)))
        .append($('<div/>').addClass('modal-body')
          .append(this.description))
        .append($('<div/>').addClass('modal-footer')
          .append(no)
          .append(yes)));
    return dialog;
  }
}
