// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const PATH = require('path');
const {
  States,
  S3Utils,
} = require('core-lib');

const BaseState = require('../shared/baseState');

class StateCreateProjectVersion extends BaseState {
  async process() {
    const output = await this.createCustomLabelsProjectVersion();
    this.setOutput(States.CreateProjectVersion, output);
    return super.process();
  }

  async createCustomLabelsProjectVersion() {
    const projectArn = await this.createProject();
    const manifest = await this.prepareTrainingDataset();
    const params = this.makeProjectVersionParams(projectArn, manifest);
    const projectVersionArn = await this.createProjectVersion(params);
    return {
      output: {
        ...manifest,
        projectArn,
        projectVersionArn,
      },
    };
  }

  async createProject() {
    const src = this.input;
    let response;

    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    // check to see if the project exists
    do {
      response = await rekog.describeProjects({
        MaxResults: 100,
        NextToken: (response || {}).NextToken,
      }).promise();

      while (response.ProjectDescriptions.length) {
        const project = response.ProjectDescriptions.shift();
        const name = project.ProjectArn.split('/')[1];
        if (name === src.labelingJobName && project.Status !== 'DELETING') {
          return project.ProjectArn;
        }
      }
    } while ((response || {}).NextToken);

    // create a new project if it doesn't exist
    return rekog.createProject({
      ProjectName: src.labelingJobName,
    }).promise().then(data => data.ProjectArn);
  }

  async prepareTrainingDataset() {
    const src = this.input;

    let sourceRefs = await S3Utils.getObject(src.bucket, src.key)
      .then(data => JSON.parse(data.Body));
    sourceRefs = sourceRefs.map(x => JSON.stringify(x));

    const parsed = PATH.parse(src.key);
    const prefix = PATH.join(parsed.dir, '..', States.CreateProjectVersion);
    const name = 'trainingDataset.manifest';
    await S3Utils.upload(src.bucket, PATH.join(prefix, name), sourceRefs.join('\n'), {
      ContentType: 'application/octet-stream',
    });

    return {
      bucket: src.bucket,
      key: PATH.join(prefix, name),
    };
  }

  makeProjectVersionParams(projectArn, manifest) {
    const parsed = PATH.parse(manifest.key);
    const prefix = PATH.join(parsed.dir, 'evaluation');
    return {
      ProjectArn: projectArn,
      VersionName: new Date().toISOString().replace(/[-:.]/g, ''),
      TrainingData: {
        Assets: [
          {
            GroundTruthManifest: {
              S3Object: {
                Bucket: manifest.bucket,
                Name: manifest.key,
              },
            },
          },
        ],
      },
      TestingData: {
        AutoCreate: true,
        Assets: [],
      },
      OutputConfig: {
        S3Bucket: manifest.bucket,
        S3KeyPrefix: prefix,
      },
    };
  }

  async createProjectVersion(params) {
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    return rekog.createProjectVersion(params).promise()
      .then(data => data.ProjectVersionArn);
  }
}

module.exports = StateCreateProjectVersion;
