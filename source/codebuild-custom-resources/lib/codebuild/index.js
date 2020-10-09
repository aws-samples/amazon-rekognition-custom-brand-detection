// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const mxBaseResponse = require('../shared/mxBaseResponse');

class X0 extends mxBaseResponse(class {}) {}

exports.StartBuild = async (event, context) => {
  const x0 = new X0(event, context);
  try {
    if (x0.isRequestType('Delete')) {
      x0.storeResponseData('Status', 'SKIPPED');
      return x0.responseData;
    }

    const data = event.ResourceProperties.Data;
    const missing = [
      'projectName',
      'environmentVariablesOverride',
    ].filter(x => data[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }

    const codebuild = new AWS.CodeBuild({
      apiVersion: '2016-10-06',
    });
    const response = await codebuild.startBuild({
      ...data,
    }).promise();

    x0.storeResponseData('Id', response.build.id);
    x0.storeResponseData('Arn', response.build.arn);
    x0.storeResponseData('Status', 'SUCCESS');
    return x0.responseData;
  } catch (e) {
    e.message = `StartBuild: ${e.message}`;
    throw e;
  }
};

exports.PostBuild = async (event, context) => {
  const x0 = new X0(event, context);
  try {
    if (x0.isRequestType('Delete')) {
      x0.storeResponseData('Status', 'SKIPPED');
      return x0.responseData;
    }

    const data = event.ResourceProperties.Data;
    const missing = [
      'WaitConditionData',
    ].filter(x => data[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }
    let output = JSON.parse(data.WaitConditionData);
    output = Object.values(output).shift();
    output = Buffer.from(output, 'base64');
    output = JSON.parse(output.toString());
    const keys = Object.keys(output);
    keys.forEach(key =>
      x0.storeResponseData(key, output[key]));
    x0.storeResponseData('Status', 'SUCCESS');
    return x0.responseData;
  } catch (e) {
    e.message = `PostBuild: ${e.message}`;
    throw e;
  }
};
