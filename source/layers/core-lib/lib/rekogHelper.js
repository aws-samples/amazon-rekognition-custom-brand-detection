const AWS = require('aws-sdk');
const Retry = require('./retry');
const ModelTimerTable = require('./modelTimerTable');

class RekogHelper {
  static getInstance() {
    return new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
  }

  static async describeProjectVersion(projectArn, projectVersionArn) {
    const params = {
      ProjectArn: projectArn,
      MaxResults: 1,
      VersionNames: [
        projectVersionArn.split('/')[3],
      ],
    };
    const rekog = RekogHelper.getInstance();
    const fn = rekog.describeProjectVersions.bind(rekog);
    const response = await Retry.run(fn, params, 4);

    while (response.ProjectVersionDescriptions.length) {
      const item = response.ProjectVersionDescriptions.shift();
      if (item.ProjectVersionArn === projectVersionArn) {
        return {
          status: item.Status,
          inferenceUnits: item.MinInferenceUnits,
        };
      }
    }
    return {
      status: 'UNKNOWN',
    };
  }

  static async detectCustomLabels(params) {
    const rekog = RekogHelper.getInstance();
    const fn = rekog.detectCustomLabels.bind(rekog);
    return Retry.run(fn, params, 3);
  }

  static async startProjectVersion(params) {
    const rekog = RekogHelper.getInstance();
    const fn = rekog.startProjectVersion.bind(rekog);
    return Retry.run(fn, params, 3);
  }

  static async updateProjectVersionTTL(projectVersionArn, ttl) {
    const createParams = RekogHelper.makeCreateParams(projectVersionArn, ttl);
    await ModelTimerTable.createItem(createParams)
      .catch((e) => {
        if (e.code === 'ConditionalCheckFailedException') {
          return undefined;
        }
        throw e;
      });
  }

  /**
   * create db item if not exists OR
   * update the item is ttl is less than new TTL.
   */
  static makeCreateParams(projectVersionArn, ttl) {
    const table = ModelTimerTable.getTable();
    return {
      TableName: table.name,
      Item: {
        [table.partition]: projectVersionArn,
        ttl,
      },
      ExpressionAttributeNames: {
        '#k0': 'ttl',
        '#k1': table.partition,
      },
      ExpressionAttributeValues: {
        ':v0': ttl,
      },
      ConditionExpression: 'attribute_not_exists(#k1) OR (#k0 <= :v0)',
      ReturnValues: 'NONE',
    };
  }
}

module.exports = RekogHelper;
