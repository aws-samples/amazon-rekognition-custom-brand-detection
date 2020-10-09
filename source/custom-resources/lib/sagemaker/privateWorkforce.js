// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const FS = require('fs');
const PATH = require('path');
const AWS = require('aws-sdk');

const mxBaseResponse = require('../shared/mxBaseResponse');

class PrivateWorkforce extends mxBaseResponse(class {}) {
  constructor(event, context) {
    super(event, context);
    /* sanity check */
    const data = event.ResourceProperties.Data;
    this.sanityCheck(data);
    this.$data = data;

    this.$cognito = new AWS.CognitoIdentityServiceProvider({
      apiVersion: '2016-04-18',
    });

    this.$sagemaker = new AWS.SageMaker({
      apiVersion: '2017-07-24',
    });
  }

  sanityCheck(data) {
    const missing = [
      'SolutionId',
      'UserPool',
      'UserGroup',
      'AppClientId',
      'TopicArn',
      'UserPoolDomain',
    ].filter(x => data[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }
  }

  get data() {
    return this.$data;
  }

  get solutionId() {
    return this.data.SolutionId;
  }

  get userPool() {
    return this.data.UserPool;
  }

  get userGroup() {
    return this.data.UserGroup;
  }

  get clientId() {
    return this.data.AppClientId;
  }

  get topicArn() {
    return this.data.TopicArn;
  }

  get userPoolDomain() {
    return this.data.UserPoolDomain;
  }

  get workteamName() {
    return `${this.userPoolDomain}-team`;
  }

  get cognito() {
    return this.$cognito;
  }

  get sagemaker() {
    return this.$sagemaker;
  }

  normalize(name) {
    return name.replace(/[^a-zA-Z0-9-]/g, '-');
  }

  async preconfigure() {
    /* create cognito domain */
    await this.cognito.createUserPoolDomain({
      Domain: this.userPoolDomain,
      UserPoolId: this.userPool,
    }).promise();

    /* update user pool client to enable OAuth in order to create workteam */
    await this.cognito.updateUserPoolClient({
      ClientId: this.clientId,
      UserPoolId: this.userPool,
      AllowedOAuthFlows: [
        'code',
        'implicit',
      ],
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthScopes: [
        'email',
        'openid',
        'profile',
      ],
      ExplicitAuthFlows: [
        'USER_PASSWORD_AUTH',
      ],
      /* Ground Truth would update this when a workteam is created */
      CallbackURLs: [
        'https://127.0.0.1',
      ],
      LogoutURLs: [
        'https://127.0.0.1',
      ],
      SupportedIdentityProviders: [
        'COGNITO',
      ],
    }).promise();
  }

  async queryCurrentTeam() {
    const {
      Workteams,
    } = await this.sagemaker.listWorkteams({
      MaxResults: 100,
    }).promise();

    if (!Workteams.length) {
      return undefined;
    }

    const team = Workteams.shift();
    if (!team.MemberDefinitions || !team.MemberDefinitions.length) {
      return undefined;
    }

    const {
      CognitoMemberDefinition,
    } = team.MemberDefinitions.shift();

    return {
      UserPool: CognitoMemberDefinition.UserPool,
      ClientId: CognitoMemberDefinition.ClientId,
    };
  }

  async cognitoCreateGroup(userPool) {
    if (!userPool) {
      throw new Error('cognitoCreateGroup - userPool is null');
    }

    /* create our user group under the existing cognito user pool */
    return this.cognito.createGroup({
      GroupName: this.userGroup,
      Description: `${this.solutionId} labeling workteam user group`,
      UserPoolId: userPool,
    }).promise();
  }

  async createTeam(current = {}) {
    /**
     * if current team exists, we would need to use the 'existing'
     * Cognito user pool and app client.
     * In that case, we will create a new user group under 'that'
     * Cognito user pool.
     */
    if (current.UserPool) {
      await this.cognitoCreateGroup(current.UserPool);
    }

    const params = {
      Description: `(${this.solutionId}) labeling workteam`,
      MemberDefinitions: [{
        CognitoMemberDefinition: {
          UserPool: current.UserPool || this.userPool,
          ClientId: current.ClientId || this.clientId,
          UserGroup: this.userGroup,
        },
      }],
      WorkteamName: this.workteamName,
      NotificationConfiguration: {
        NotificationTopicArn: this.topicArn,
      },
      Tags: [
        {
          Key: 'SolutionId',
          Value: this.solutionId,
        },
      ],
    };

    await this.sagemaker.createWorkteam(params).promise();

    const {
      Workteam,
    } = await this.sagemaker.describeWorkteam({
      WorkteamName: this.workteamName,
    }).promise();

    return Workteam;
  }

  async postconfigure(team = {}) {
    if (!team.SubDomain) {
      throw new Error('postconfigure - SubDomain is null');
    }

    let template = PATH.join(PATH.dirname(__filename), 'fixtures/email.template');
    template = FS.readFileSync(template);
    template = template.toString().replace(/%URI%/g, `https://${team.SubDomain}`);

    await this.cognito.updateUserPool({
      UserPoolId: this.userPool,
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: true,
        InviteMessageTemplate: {
          EmailMessage: template,
          EmailSubject: `You are invited by ${this.workteamName} to work on a labeling project.`,
        },
      },
    }).promise();
  }

  async createResource() {
    await this.preconfigure();
    const current = await this.queryCurrentTeam();
    const team = await this.createTeam(current);
    await this.postconfigure(team);

    this.storeResponseData('UserPool', (current && current.UserPool) || this.userPool);
    this.storeResponseData('ClientId', (current && current.ClientId) || this.clientId);
    this.storeResponseData('UserGroup', this.userGroup);
    this.storeResponseData('TeamName', this.workteamName);
    this.storeResponseData('TeamArn', team.WorkteamArn);
    this.storeResponseData('Status', 'SUCCESS');

    return this.responseData;
  }

  async deleteResource() {
    try {
      const {
        Workteam,
      } = await this.sagemaker.describeWorkteam({
        WorkteamName: this.workteamName,
      }).promise();

      /* delete workteam only if it exists */
      if ((Workteam || {}).WorkteamArn) {
        const {
          Success,
        } = await this.sagemaker.deleteWorkteam({
          WorkteamName: this.workteamName,
        }).promise();

        if (!Success) {
          throw new Error(`failed to delete Workteam, ${this.workteamName}`);
        }
      }

      /* delete user group */
      if ((Workteam || {}).MemberDefinitions) {
        const {
          UserGroup,
          UserPool,
        } = (Workteam.MemberDefinitions.shift() || {}).CognitoMemberDefinition || {};

        /* only if the user group is created under a different cognito user pool */
        if (UserGroup && UserPool && this.userPool !== UserPool) {
          await this.cognito.deleteGroup({
            GroupName: UserGroup,
            UserPoolId: UserPool,
          }).promise();
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const response = await this.cognito.describeUserPoolDomain({
        Domain: this.userPoolDomain,
      }).promise();

      /* delete domain only if it exists */
      if (((response || {}).DomainDescription || {}).Domain) {
        await this.cognito.deleteUserPoolDomain({
          Domain: this.userPoolDomain,
          UserPoolId: this.userPool,
        }).promise();
      }
    } catch (e) {
      console.error(e);
    }

    this.storeResponseData('Status', 'DELETED');

    return this.responseData;
  }

  async updateResource() {
    await this.deleteResource();
    return this.createResource();
  }

  async configure() {
    if (this.isRequestType('Delete')) {
      return this.deleteResource();
    }

    if (this.isRequestType('Update')) {
      return this.updateResource();
    }

    return this.createResource();
  }
}

module.exports = PrivateWorkforce;
