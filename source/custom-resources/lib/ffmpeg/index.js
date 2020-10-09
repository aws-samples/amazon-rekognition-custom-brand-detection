// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const mxBaseResponse = require('../shared/mxBaseResponse');

class X0 extends mxBaseResponse(class {}) {}

exports.ShouldUseFFmpeg = async (event, context) => {
  const x0 = new X0(event, context);
  try {
    if (x0.isRequestType('Delete')) {
      x0.storeResponseData('Status', 'SKIPPED');
      return x0.responseData;
    }
    const data = event.ResourceProperties.Data;
    if (data.AgreeFFmpegUse !== 'AGREE AND INSTALL') {
      throw new Error(data.AgreeFFmpegUse);
    }
    x0.storeResponseData('Status', data.AgreeFFmpegUse);
    return x0.responseData;
  } catch (e) {
    e.message = `ShouldUseFFmpeg: ${e.message}`;
    throw e;
  }
};
