// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const Retry = require('./retry');

class ModelTimerTable {
  static get TTL() {
    return {
      MinInSeconds: 60, // 1 mins
      MaxInSeconds: 172800, // 2 days
      DefaultInSeconds: 86400, // 1 days
    };
  }

  static timeToLiveInSeconds(seconds = ModelTimerTable.TTL.DefaultInSeconds) {
    const max = Math.max(seconds, ModelTimerTable.TTL.MinInSeconds);
    const ttl = Math.min(max, ModelTimerTable.TTL.MaxInSeconds);
    return Math.floor((new Date().getTime() / 1000) + ttl);
  }

  static getTable() {
    if (!process.env.ENV_MODEL_TIMER_TABLE && !process.env.ENV_MODEL_TIMER_TABLE_PARTITION_KEY) {
      throw new Error('missing environment variable');
    }
    return {
      name: process.env.ENV_MODEL_TIMER_TABLE,
      partition: process.env.ENV_MODEL_TIMER_TABLE_PARTITION_KEY,
    };
  }

  static getDocumentClient() {
    return new AWS.DynamoDB.DocumentClient({
      apiVersion: '2012-08-10',
    });
  }

  static async createItem(params) {
    const db = ModelTimerTable.getDocumentClient();
    return Retry.run(db.put.bind(db), params, 10);
  }

  static async updateItem(params) {
    const db = ModelTimerTable.getDocumentClient();
    return Retry.run(db.update.bind(db), params, 10);
  }

  static async deleteItem(params) {
    const db = ModelTimerTable.getDocumentClient();
    return Retry.run(db.delete.bind(db), params, 10);
  }

  static async queryItems(params, limit = 10) {
    const db = ModelTimerTable.getDocumentClient();
    const fn = db.query.bind(db);

    let response;
    const items = [];
    do {
      response = await Retry.run(fn, {
        ...params,
        ExclusiveStartKey: (response || {}).LastEvaluatedKey,
      });
      items.splice(items.length, 0, ...response.Items);
    } while (response.LastEvaluatedKey && items.length < limit);
    return items;
  }
}

module.exports = ModelTimerTable;
