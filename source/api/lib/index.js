// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const mxValidation = require('./mxValidation');

class ApiRequest extends mxValidation(class {}) {
  constructor(event, context) {
    super();
    this.$event = event;
    this.$context = context;
    this.$accountId = context.invokedFunctionArn.split(':')[4];
    const identity = ((event.requestContext || {}).identity || {}).cognitoIdentityId
      || (event.queryStringParameters || {}).requester;
    this.$cognitoIdentityId = (identity)
      ? decodeURIComponent(identity)
      : undefined;

    try {
      this.$body = JSON.parse(this.$event.body);
    } catch (e) {
      this.$body = {};
    }
  }

  static get Methods() {
    return {
      OPTIONS: 'OPTIONS',
      GET: 'GET',
      POST: 'POST',
      DELETE: 'DELETE',
    };
  }

  static get Constants() {
    return {
      AllowMethods: Object.values(ApiRequest.Methods),
      AllowHeaders: [
        'Authorization',
        'Host',
        'Content-Type',
        'X-Amz-Date',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'x-amz-content-sha256',
        'x-amz-user-agent',
      ],
    };
  }

  static get Operations() {
    return {
      Training: 'training',
      Analyze: 'analyze',
      Team: 'team',
      Model: 'model',
    };
  }

  get event() {
    return this.$event;
  }

  get context() {
    return this.$context;
  }

  get accountId() {
    return this.$accountId;
  }

  get cognitoIdentityId() {
    return this.$cognitoIdentityId;
  }

  get method() {
    return this.event.httpMethod;
  }

  get path() {
    return this.event.path;
  }

  get headers() {
    return this.event.headers;
  }

  get queryString() {
    return this.event.queryStringParameters;
  }

  get pathParameters() {
    return this.event.pathParameters;
  }

  get body() {
    return this.$body;
  }

  opSupported() {
    const op = (this.pathParameters || {}).operation;
    if (!this.testOperation(op)) {
      return false;
    }
    return !!(Object.values(ApiRequest.Operations)
      .find(x => x === op));
  }

  validateIdentity() {
    return !(this.cognitoIdentityId && !this.testCognitoIdentityId(this.cognitoIdentityId));
  }

  async onOPTIONS() {
    if (!this.validateIdentity()) {
      throw new Error('invalid user id');
    }
    if (!this.opSupported()) {
      throw new Error('operation not supported');
    }
    return this.onSucceeded();
  }

  async onGET() {
    if (!this.validateIdentity()) {
      throw new Error('invalid user id');
    }
    if (!this.opSupported()) {
      throw new Error('operation not supported');
    }
    const op = this.pathParameters.operation;
    if (op === ApiRequest.Operations.Analyze || op === ApiRequest.Operations.Training) {
      return this.onGetExecution();
    }
    if (op === ApiRequest.Operations.Team) {
      return this.onGetTeamMembers();
    }
    if (op === ApiRequest.Operations.Model) {
      return this.onGetModels();
    }
    throw new Error('operation not supported');
  }

  async onPOST() {
    if (!this.validateIdentity()) {
      throw new Error('invalid user id');
    }
    if (!this.opSupported()) {
      throw new Error('operation not supported');
    }
    const op = this.pathParameters.operation;
    if (op === ApiRequest.Operations.Training) {
      return this.onPostTraining();
    }
    if (op === ApiRequest.Operations.Analyze) {
      return this.onPostAnalysis();
    }
    if (op === ApiRequest.Operations.Model) {
      return this.onPostModel();
    }
    if (op === ApiRequest.Operations.Team) {
      return this.onPostAddMembers();
    }
    throw new Error('operation not supported');
  }

  async onDELETE() {
    if (!this.validateIdentity()) {
      throw new Error('invalid user id');
    }
    if (!this.opSupported()) {
      throw new Error('operation not supported');
    }
    const op = this.pathParameters.operation;
    if (op === ApiRequest.Operations.Team) {
      return this.onDeleteTeamMember();
    }
    throw new Error('operation not supported');
  }

  async onSucceeded(payload) {
    return {
      statusCode: 200,
      headers: this.getCORS(payload),
      body: (!payload || typeof payload === 'string')
        ? payload
        : JSON.stringify(payload),
    };
  }

  async onError(e) {
    const payload = {
      ErrorMessage: `${this.method} ${this.path} - ${e.message || e.code || 'unknown error'}`,
    };
    console.error(e);
    return {
      statusCode: 400,
      headers: this.getCORS(payload),
      body: payload,
    };
  }

  getCORS(data) {
    const h0 = this.headers || {};
    return {
      'Content-Type': (!data || typeof data === 'string')
        ? 'text/plain'
        : 'application/json',
      'Access-Control-Allow-Methods': ApiRequest.Constants.AllowMethods.join(', '),
      'Access-Control-Allow-Headers': ApiRequest.Constants.AllowHeaders.join(', '),
      'Access-Control-Allow-Origin': h0.Origin || h0.origin || h0['X-Forwarded-For'] || '*',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  async onGetExecution() {
    const name = decodeURIComponent(this.queryString.stateMachine);
    let execution = this.queryString.execution;
    let token = this.queryString.token;
    let maxResults = this.queryString.maxResults;
    let filter = this.queryString.filter;

    if (!this.testStateMachineName(name)) {
      throw new Error('invalid state machine name');
    }
    if (execution) {
      execution = decodeURIComponent(execution);
      if (!this.testExecutionName(name)) {
        throw new Error('invalid state machine name');
      }
      const arn = [
        'arn:aws:states',
        process.env.AWS_REGION,
        this.accountId,
        'execution',
        name,
        execution,
      ].join(':');
      return this.onSucceeded(await this.describeExecution(arn));
    }
    if (token) {
      token = decodeURIComponent(token);
      if (token === 'undefined') {
        token = undefined;
      } else if (!this.testBase64String(token)) {
        throw new Error('invalid token');
      }
    }
    if (maxResults) {
      maxResults = Number.parseInt(maxResults, 10);
    }
    if (filter) {
      if (!this.testFilter(filter)) {
        throw new Error('invalid filter');
      }
      filter = filter.toUpperCase();
    }

    const arn = [
      'arn:aws:states',
      process.env.AWS_REGION,
      this.accountId,
      'stateMachine',
      name,
    ].join(':');
    return this.onSucceeded(await this.listExecutions(arn, filter, token, maxResults));
  }

  async onGetTeamMembers() {
    const name = decodeURIComponent(this.queryString.teamName);
    if (!this.testTeamName(name)) {
      throw new Error('invalid team name');
    }
    const response = await this.describeTeam(name);
    const members = await this.listUsersInGroup(response.UserPool, response.UserGroup);
    return this.onSucceeded(members);
  }

  async onDeleteTeamMember() {
    const name = decodeURIComponent(this.queryString.teamName);
    if (!this.testTeamName(name)) {
      throw new Error('invalid team name');
    }
    const member = decodeURIComponent(this.queryString.member);
    if (!this.testEmailAddress(member)) {
      throw new Error('invalid email address');
    }
    const response = await this.describeTeam(name);
    await Promise.all([
      this.cognitoDeleteUser(member, response.UserPool, response.UserGroup),
      this.snsUnsubscribe(member, response.NotificationTopicArn),
    ]);
    return this.onSucceeded(member);
  }

  async onPostTraining() {
    const input = this.body.input;
    const output = this.body.output || {};

    const missing = [
      'bucket',
      'keys',
      'labels',
      'projectName',
    ].filter(x => input[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }
    if (!input.keys.length) {
      throw new Error('keys cannot be empty');
    }
    if (!input.labels.length) {
      throw new Error('labels cannot be empty');
    }
    if (!this.testBucket(input.bucket)) {
      throw new Error('invalid bucket');
    }
    if (!this.testProjectName(input.projectName)) {
      throw new Error('invalid project name');
    }
    for (let i = 0; i < input.labels.length; i++) {
      if (!this.testLabel(input.labels[i])) {
        throw new Error('invalid label name');
      }
    }

    const name = decodeURIComponent(this.queryString.stateMachine);
    if (!this.testStateMachineName(name)) {
      throw new Error('invalid state machine name');
    }

    const arn = [
      'arn:aws:states',
      process.env.AWS_REGION,
      this.accountId,
      'stateMachine',
      name,
    ].join(':');
    let response = await this.startExecution(arn, {
      input,
      output,
    });
    response = await this.describeExecution(response.executionArn);
    return this.onSucceeded(response);
  }

  async onPostAnalysis() {
    const input = this.body.input;
    const output = this.body.output || {};
    if (!(input.bucket && input.key)) {
      throw new Error('\'bucket\' and \'key\' must be specified');
    }
    if (!this.testBucket(input.bucket)) {
      throw new Error('invalid bucket');
    }
    const name = decodeURIComponent(this.queryString.stateMachine);
    if (!this.testStateMachineName(name)) {
      throw new Error('invalid state machine name');
    }

    const arn = [
      'arn:aws:states',
      process.env.AWS_REGION,
      this.accountId,
      'stateMachine',
      name,
    ].join(':');
    let response = await this.startExecution(arn, {
      input,
      output,
    });
    response = await this.describeExecution(response.executionArn);
    return this.onSucceeded(response);
  }

  async onPostAddMembers() {
    const data = this.body;
    if (!(data.teamName && (data.members || []).length)) {
      throw new Error('\'teamName\' and \'members\' must be specified');
    }
    if (!this.testTeamName(data.teamName)) {
      throw new Error('invalid team name');
    }
    for (let i = 0; i < data.members.length; i++) {
      if (!this.testEmailAddress(data.members[i])) {
        throw new Error('invalid email address');
      }
    }

    const response = await this.describeTeam(data.teamName);
    for (let i = 0; i < data.members.length; i++) {
      const member = data.members[i];
      await Promise.all([
        this.cognitoCreateUserInGroup(member, response.UserPool, response.UserGroup),
        this.snsSubscribe(member, response.NotificationTopicArn),
      ]);
    }
    return this.onSucceeded(data.members);
  }

  async onGetModels() {
    let response;
    const projects = [];
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });

    do {
      response = await rekog.describeProjects({
        MaxResults: 100,
        NextToken: (response || {}).NextToken,
      }).promise();
      projects.splice(projects.length, 0, ...response.ProjectDescriptions
        .filter(x => x.Status === 'CREATED')
        .map(x => ({
          name: x.ProjectArn.split('/')[1],
          projectArn: x.ProjectArn,
        })));
    } while ((response || {}).NextToken);

    response = await Promise.all(projects.map(x =>
      this.describeProjectVersion(x)));
    return this.onSucceeded(response);
  }

  async onPostModel() {
    const data = this.body;
    if (!data.projectVersionArn && !data.action) {
      throw new Error('\'action\' and \'projectVersionArn\' must be specified');
    }
    if (!this.testProjectVersionArn(data.projectVersionArn)) {
      throw new Error('invalid projectVersionArn');
    }
    if (data.action !== 'stop') {
      throw new Error('unsupported action');
    }
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    const response = await rekog.stopProjectVersion({
      ProjectVersionArn: data.projectVersionArn,
    }).promise().catch(() => undefined);
    return this.onSucceeded(response);
  }

  async describeProjectVersion(project) {
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    const response = await rekog.describeProjectVersions({
      ProjectArn: project.projectArn,
      MaxResults: 100,
    }).promise();
    const modified = project;
    modified.versions = response.ProjectVersionDescriptions
      .filter(x =>
        x.Status !== 'TRAINING_FAILED'
        && x.Status !== 'FAILED'
        && x.Status !== 'DELETING')
      .map(x => ({
        name: x.ProjectVersionArn.split('/')[3],
        projectVersionArn: x.ProjectVersionArn,
        createdAt: new Date(x.CreationTimestamp).getTime(),
        status: x.Status,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    return modified;
  }

  async startExecution(arn, data) {
    const step = new AWS.StepFunctions({
      apiVersion: '2016-11-23',
    });
    return step.startExecution({
      stateMachineArn: arn,
      input: JSON.stringify(data, null, 2),
    }).promise();
  }

  async describeExecution(arn) {
    const step = new AWS.StepFunctions({
      apiVersion: '2016-11-23',
    });
    const response = await step.describeExecution({
      executionArn: arn,
    }).promise();
    const lastState = await this.getRunningState(response);
    if (lastState) {
      response.runningState = lastState.name;
      // in case it is map state iterator, avoid overwrite .input
      if (JSON.parse(lastState.input).input) {
        response.input = lastState.input;
      }
    }
    return response;
  }

  async listExecutions(arn, filter, token, maxResults = 20) {
    const step = new AWS.StepFunctions({
      apiVersion: '2016-11-23',
    });

    const response = await step.listExecutions({
      stateMachineArn: arn,
      statusFilter: filter,
      maxResults,
      nextToken: token,
    }).promise();

    const executions = await Promise.all(response.executions.map(x =>
      this.describeExecution(x.executionArn)));
    response.executions = executions;
    return response;
  }

  async getRunningState(data) {
    if (data.status !== 'RUNNING') {
      return undefined;
    }
    const step = new AWS.StepFunctions({
      apiVersion: '2016-11-23',
    });
    const history = await step.getExecutionHistory({
      executionArn: data.executionArn,
      maxResults: 10,
      reverseOrder: true,
    }).promise();
    return this.parseLastActiveState(history.events);
  }

  parseLastActiveState(events) {
    const state = events.find(x =>
      x.type === 'TaskStateEntered' || x.type === 'MapStateEntered');
    return (state || {}).stateEnteredEventDetails;
  }

  async describeTeam(name) {
    const sagemaker = new AWS.SageMaker({
      apiVersion: '2017-07-24',
    });
    const response = await sagemaker.describeWorkteam({
      WorkteamName: name,
    }).promise();
    if (!response.Workteam) {
      throw new Error('workteam not found, likely caused by misconfiguration');
    }
    const memberDefinitions = ((response.Workteam.MemberDefinitions || []).shift() || {})
      .CognitoMemberDefinition;
    if (!memberDefinitions) {
      throw new Error('userpool not found, likely caused by misconfiguration');
    }
    return {
      ...memberDefinitions,
      ...response.Workteam.NotificationConfiguration,
    };
  }

  async listUsersInGroup(userPool, userGroup) {
    let response;
    const users = [];
    if (!userPool || !userGroup) {
      throw new Error('invalid userpool or usergroup');
    }
    const cognito = new AWS.CognitoIdentityServiceProvider({
      apiVersion: '2016-04-18',
    });
    do {
      response = await cognito.listUsersInGroup({
        GroupName: userGroup,
        UserPoolId: userPool,
        NextToken: (response || {}).NextToken,
      }).promise();
      users.splice(users.length, 0, ...response.Users);
    } while ((response || {}).NextToken);
    /* filter enabled users and return his/her email address */
    const members = users.filter(x => x.Enabled).map(x =>
      (x.Attributes.find(x0 => x0.Name === 'email') || {}).Value).filter(x => x);
    return members;
  }

  async cognitoDeleteUser(member, userPool, userGroup) {
    if (!member || !userPool || !userGroup) {
      throw new Error('invalid userpool or usergroup');
    }
    const username = member.split('@').filter(x => x).shift();
    const cognito = new AWS.CognitoIdentityServiceProvider({
      apiVersion: '2016-04-18',
    });
    /* remove user from group */
    await cognito.adminRemoveUserFromGroup({
      GroupName: userGroup,
      UserPoolId: userPool,
      Username: username,
    }).promise();
    /* delete user */
    return cognito.adminDeleteUser({
      UserPoolId: userPool,
      Username: username,
    }).promise();
  }

  async cognitoCreateUserInGroup(member, userPool, userGroup) {
    const username = member.split('@').filter(x => x).shift();
    const cognito = new AWS.CognitoIdentityServiceProvider({
      apiVersion: '2016-04-18',
    });
    const response = await cognito.adminCreateUser({
      UserPoolId: userPool,
      Username: username,
      DesiredDeliveryMediums: [
        'EMAIL',
      ],
      UserAttributes: [
        {
          Name: 'email',
          Value: member,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
      ],
    }).promise().catch(e => ((e.code === 'UsernameExistsException')
      ? undefined
      : e));
    if (response instanceof Error) {
      return response;
    }
    return cognito.adminAddUserToGroup({
      GroupName: userGroup,
      UserPoolId: userPool,
      Username: username,
    }).promise();
  }

  async snsSubscribe(member, topicArn) {
    if (!topicArn && !member) {
      return undefined;
    }
    const sns = new AWS.SNS({
      apiVersion: '2010-03-31',
    });
    return sns.subscribe({
      Protocol: 'email',
      TopicArn: topicArn,
      Endpoint: member,
    }).promise();
  }

  async snsUnsubscribe(member, topicArn) {
    if (!topicArn && !member) {
      return undefined;
    }

    let response;
    const subscriptions = [];
    const sns = new AWS.SNS({
      apiVersion: '2010-03-31',
    });
    do {
      response = await sns.listSubscriptionsByTopic({
        TopicArn: topicArn,
        NextToken: (response || {}).NextToken,
      }).promise();
      subscriptions.splice(subscriptions.length, 0, ...response.Subscriptions);
    } while ((response || {}).NextToken);

    return Promise.all(subscriptions.map(x => (
      (x.Endpoint === member && x.SubscriptionArn.indexOf('arn:aws:sns') === 0)
        ? sns.unsubscribe({
          SubscriptionArn: x.SubscriptionArn,
        }).promise().catch(() => undefined)
        : undefined)));
  }
}

module.exports = {
  ApiRequest,
};
