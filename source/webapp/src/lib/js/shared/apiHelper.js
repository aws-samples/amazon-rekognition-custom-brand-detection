// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import AppUtils from './appUtils.js';

export default class ApiHelper {
  static get Endpoints() {
    return {
      Training: `${SolutionManifest.ApiEndpoint}/training`,
      Analyze: `${SolutionManifest.ApiEndpoint}/analyze`,
      Team: `${SolutionManifest.ApiEndpoint}/team`,
      Model: `${SolutionManifest.ApiEndpoint}/model`,
    };
  }

  static async startNewProject(body, query) {
    return AppUtils.authHttpRequest('POST', ApiHelper.Endpoints.Training, query, body);
  }

  static async getTrainingExecution(query) {
    return AppUtils.authHttpRequest('GET', ApiHelper.Endpoints.Training, query);
  }

  static async getAnalysisExecution(query) {
    return AppUtils.authHttpRequest('GET', ApiHelper.Endpoints.Analyze, query);
  }

  static async getTeamMembers(query) {
    return AppUtils.authHttpRequest('GET', ApiHelper.Endpoints.Team, query);
  }

  static async addTeamMembers(body, query) {
    return AppUtils.authHttpRequest('POST', ApiHelper.Endpoints.Team, query, body);
  }

  static async deleteTeamMember(query) {
    return AppUtils.authHttpRequest('DELETE', ApiHelper.Endpoints.Team, query);
  }

  static async describeCustomLabels(query) {
    return AppUtils.authHttpRequest('GET', ApiHelper.Endpoints.Model, query);
  }

  static async stopCustomLabels(body, query) {
    console.log(`STOPPING MODEL: ${JSON.stringify(body, null, 2)}`);
    return AppUtils.authHttpRequest('POST', ApiHelper.Endpoints.Model, query, body);
  }

  static async startAnalysis(body, query) {
    return AppUtils.authHttpRequest('POST', ApiHelper.Endpoints.Analyze, query, body);
  }
}
