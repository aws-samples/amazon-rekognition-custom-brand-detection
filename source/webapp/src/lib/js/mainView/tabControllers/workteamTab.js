// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../shared/localization.js';
import AppUtils from '../../shared/appUtils.js';
import ApiHelper from '../../shared/apiHelper.js';
import mxSpinner from '../../mixins/mxSpinner.js';
import mxAlert from '../../mixins/mxAlert.js';
import mxReadable from '../../mixins/mxReadable.js';
import BaseTab from './baseTab.js';
import {
  AWSConsoleSageMaker,
} from '../../shared/awsConsole.js';

export default class WorkteamTab extends mxReadable(mxAlert(mxSpinner(BaseTab))) {
  constructor(defaultTab = false) {
    super(Localization.Messages.WorkteamTab, {
      selected: defaultTab,
    });

    this.$ids = {
      ...super.ids,
      carousel: {
        container: `setting-${AppUtils.randomHexstring()}`,
      },
    };
    this.tabContent.append($('<div/>').addClass('container p-0 m-0 col-12')
      .append(this.createLoading()));
  }

  get ids() {
    return this.$ids;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }

    const description = this.createDescription();
    const team = this.createTeamSection();
    const members = await this.createTeamMemberSection();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(description)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(team)))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(members)));

    this.tabContent.append(row);
    return super.show();
  }

  async hide() {
    await super.hide();
    this.tabContent.append($('<div/>').addClass('container p-0 m-0 col-12')
      .append(this.createLoading()));
  }

  createDescription() {
    return $('<p/>').addClass('lead')
      .html(Localization.Messages.WorkteamTabDesc);
  }

  createTeamSection() {
    const title = $('<span/>').addClass('d-block p-0 bg-light text-black lead')
      .html(Localization.Messages.Team);

    const teamName = SolutionManifest.PrivateWorkforce.TeamName;
    const teamDesc = Localization.Messages.TeamDesc.replace('{{TEAM_USERPOOL_URL}}', AWSConsoleSageMaker.getGroundTruthPrivateTeamUrl(teamName));
    const desc = $('<p/>').addClass('mt-2')
      .html(teamDesc);

    const select = this.createFormItem(Localization.Messages.SelectedTeam, teamName, 'team-name');
    const form = $('<form/>')
      .addClass('col-9 mx-auto')
      .append(select);

    return $('<div/>').addClass('mt-4')
      .append(title)
      .append(desc)
      .append(form);
  }

  async createActiveMembers() {
    const teamName = SolutionManifest.PrivateWorkforce.TeamName;
    const members = await ApiHelper.getTeamMembers({
      teamName,
    });

    const title = $('<span/>').addClass('d-block p-0 mt-4 text-black lead-sm')
      .html(Localization.Messages.ActiveMemberList.replace('{{MEMBERS}}', members.length));

    const id = AppUtils.randomHexstring();
    const group = $('<div/>').addClass('p-0 m-0 mt-2')
      .attr('id', id);
    while (members.length) {
      const member = members.shift();
      const badge = this.createEmailBadge(member);
      group.append(badge);
    }
    return [
      title,
      group,
    ];
  }

  createEmailBadge(member) {
    const badge = $('<span/>').addClass('badge badge-pill badge-secondary lead-xs my-1 py-2 mr-1');
    const anchor = $('<a/>').addClass('member-anchor')
      .attr('href', '#')
      .attr('data-toggle', 'tooltip')
      .attr('data-placement', 'bottom')
      .attr('title', Localization.Messages.RemoveMember)
      .append($('<i/>').addClass('fas fa-times-circle pl-1'));
    anchor.off('click').on('click', async (event) => {
      if (await this.onRemoveMember(member)) {
        badge.remove();
      }
    });
    return badge.append(member).append(anchor);
  }

  async createAddMemberControls(activeGroup) {
    const title = $('<span/>').addClass('d-block p-0 mt-4 mb-2 text-black lead-sm')
      .html(Localization.Messages.AddMemberDesc);

    const id = AppUtils.randomHexstring();
    const form = $('<form/>').addClass('col-9 px-0 needs-validation')
      .attr('id', id)
      .attr('novalidate', 'novalidate');

    const addEmail = $('<button/>').addClass('btn btn-primary btn-sm mb-2 mr-1')
      .attr('type', 'button')
      .html(Localization.Buttons.AddEmail);
    const confirm = $('<button/>').addClass('btn btn-success btn-sm mb-2 mr-1')
      .attr('type', 'button')
      .html(Localization.Buttons.ConfirmNow);
    const btnGrp = $('<div/>').addClass('form-group mt-2')
      .append(addEmail)
      .append(confirm);

    addEmail.off('click').on('click', async (event) => {
      event.preventDefault();
      btnGrp.before(this.createEmailField());
      return true;
    });

    confirm.off('click').on('click', async (event) => {
      event.preventDefault();
      const members = [];
      const inputGrps = form.children('.input-group');
      inputGrps.each((k, inputGrp) => {
        const email = $(inputGrp).find('[data-attr-type="email"]').val();
        if (email) {
          members.push(email);
        }
      });
      if (!members.length) {
        this.shake(btnGrp);
        return this.showAlert(Localization.Alerts.NoNewMembers);
      }
      await this.onAddNewMembers(members);
      members.forEach(member =>
        activeGroup.append(this.createEmailBadge(member)));
      return inputGrps.children().remove();
    });

    return [
      title,
      form.append(btnGrp),
    ];
  }

  createEmailField() {
    const inputGrp = $('<div/>').addClass('input-group mb-2 mr-sm-2');
    const label = $('<input/>').addClass('form-control col-3')
      .attr('data-attr-type', 'email')
      .attr('type', 'email')
      .attr('placeholder', '(Email)');
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
          await this.showAlert(Localization.Alerts.InvalidEmail);
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

  async createTeamMemberSection() {
    const title = $('<span/>').addClass('d-block p-0 text-black lead mb-4')
      .html(Localization.Messages.ManageTeam);

    const [
      activeMemberDesc,
      activeMemberGroup,
    ] = await this.createActiveMembers();

    const [
      addMemberDesc,
      addMemberForm,
    ] = await this.createAddMemberControls(activeMemberGroup);

    return $('<div/>').addClass('mt-4')
      .append(title)
      .append(activeMemberDesc)
      .append(activeMemberGroup)
      .append(addMemberDesc)
      .append(addMemberForm);
  }

  createFormItem(name, value, type, url) {
    const id = AppUtils.randomHexstring();
    const item = $('<div/>').addClass('form-group row')
      .append($('<div/>').addClass('input-group col-8 d-flex mx-auto my-2')
        .append($('<div/>').addClass('input-group-prepend')
          .append($('<label/>').addClass('input-group-text')
            .attr('for', id)
            .append(name)))
        .append($('<select/>').addClass('custom-select')
          .attr('id', id)
          .attr('data-type', type)
          .append($('<option/>')
            .attr('selected', true)
            .attr('value', value)
            .append(value))));
    if (url) {
      item.append($('<div/>').addClass('col-3 p-0 m-0 d-flex my-auto')
        .append($('<a/>').addClass('btn btn-sm btn-link')
          .attr('href', url)
          .attr('target', '_blank')
          .append(Localization.Tooltips.ViewOnAWSConsole)));
    }
    return item;
  }

  async onRemoveMember(member) {
    const teamName = SolutionManifest.PrivateWorkforce.TeamName;
    let message = Localization.Messages.RemoveMemberConfirmation
      .replace('{{TEAM_MEMBER}}', member)
      .replace('{{WORKTEAM}}', teamName);
    if (!window.confirm(message)) {
      return false;
    }

    this.loading(true);
    const response = await ApiHelper.deleteTeamMember({
      teamName,
      member,
    }).catch(e => e);

    if (response instanceof Error) {
      message = Localization.Alerts.RemoveMemberError
        .replace('{{TEAM_MEMBER}}', member)
        .replace('{{WORKTEAM}}', teamName);
      await this.showAlert(message);
      this.loading(false);
      return false;
    }
    this.loading(false);
    return true;
  }

  async onAddNewMembers(members) {
    const teamName = SolutionManifest.PrivateWorkforce.TeamName;
    this.loading(true);
    const response = await ApiHelper.addTeamMembers({
      teamName,
      members,
    }).catch(e => e);

    if (response instanceof Error) {
      const message = Localization.Alerts.AddMemberError
        .replace('{{TEAM_MEMBER}}', members.join(', '))
        .replace('{{WORKTEAM}}', teamName);
      await this.showAlert(message);
      this.loading(false);
      return false;
    }
    this.loading(false);
    return true;
  }

  async showAlert(message, duration) {
    return super.showMessage(this.tabContent, 'danger', Localization.Alerts.Oops, message, duration);
  }
}
