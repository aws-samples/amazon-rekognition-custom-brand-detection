// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const PrivateWorkforce = require('./privateWorkforce');

exports.PrivateWorkforceConfiguration = async (event, context) => {
  try {
    const workteam = new PrivateWorkforce(event, context);
    return workteam.isRequestType('Delete')
      ? workteam.deleteResource()
      : workteam.isRequestType('Update')
        ? workteam.updateResource()
        : workteam.createResource();
  } catch (e) {
    e.message = `PrivateWorkforceConfiguration: ${e.message}`;
    throw e;
  }
};
