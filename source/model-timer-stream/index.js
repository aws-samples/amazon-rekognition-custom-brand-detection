// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const ModelTimerStream = require('./lib/modelTimerStream');

exports.handler = async (event, context) => {
  console.log(`\
  event = ${JSON.stringify(event, null, 2)};\n\
  context = ${JSON.stringify(context, null, 2)};\
  `);
  const stream = new ModelTimerStream(event, context);
  return stream.process();
};
