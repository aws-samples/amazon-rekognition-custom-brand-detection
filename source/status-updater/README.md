# State Updater Lambda Function

## Overview

![Service Integration Technique](../../deployment/images/amazon-rekognition-custom-brand-detection-service-integration.jpg)

Recap the Service Integration, the Status Updater lambda function is triggered by an Amazon SageMaker Ground Truth CloudWatch Event in Step 4.

The Amazon CloudWatch Event contanis:
```json
{
    "version": "0",
    "id": "2b95e9c8-b2fe-ea54-46f4-5a034ca94a6d",
    "detail-type": "SageMaker Ground Truth Labeling Job State Change",
    "source": "aws.sagemaker",
    "account": "<account>",
    "time": "2020-09-06T07:46:23Z",
    "region": "<region>",
    "resources": [
        "arn:aws:sagemaker:<region>:<account>:labeling-job/<project-name>"
    ],
    "detail": {
        "LabelingJobStatus": "Completed"
    }
}

```

The Status Updater lambda function queries the AWS Step Functions execution task token from Amazon DynamoDB table using the unique labeling job Id (resources[0]).

Based on the status of the labeling job, **detail.LabelingJobStatus**, the lambda function calls StepFunctions.sendTaskSuccess or sendTaskFailure API to notify the state machine execution in Step 5.

See the actual implementation, [labelingJobStatus.js](./lib/cloudwatch/labelingJobStatus.js)

___

Return to [README](../../README.md)