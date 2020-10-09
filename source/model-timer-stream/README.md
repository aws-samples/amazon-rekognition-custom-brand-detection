# Model Timer Stream - Amazon DynamoDB Table and Amazon DynamoDB Stream

## Overview

The Model Timer (Amazon DynamoDB) table is used to keep track of the runtime of a running model.

| Attribute | Description |
|:----------|:------------|
| projectVersionArn | a partition key to identify the running model |
| ttl | a Time To Live attribute to indicate the expiration time of the item | 

The table is configured to enable Stream where a lambda function, model-timer-stream is attached to the Stream. When a change occurs on the table, the model-timer-stream lambda function is invoked to process the event.

In this solution, we use the DynamoDB Stream to trigger the model-timer-stream lambda function to handle the REMOVE event. Upon the REMOVE event, the lambda function calls Rekognition.stopProjectVersion API to stop the running model.

See the actual implementation, [modelTimerStream.js](./lib/modelTimerStream.js)

___

Return to [README](../../README.md)