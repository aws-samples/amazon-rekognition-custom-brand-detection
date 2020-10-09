# RESTful API Component

The solution creates a RESTful API endpoint to allow communications between the webapp and the backend AWS Step Functions training and analysis state machine. No direct access to the state machine is allowed by the webapp. Each HTTP incoming request is also authenicated with AWS_IAM.

The following sections describe:
* The RESTful API endpoints
* and IAM role policy and permission

__

## Amazon API Gateway RESTful endpoint
The RESTful endpoint exposes the following operations.

| Purpose | Path | Method | Query | Body |
|:--------|:-----|:-------|:------|:-----|
| _Training_ | | | | |
| Get a list of training process statuses | /\<stage\>/training | GET | stateMachine=\<state-machine-name\> | -- |
| Get a specific training process status | /\<stage\>/training | GET | stateMachine=\<state-machine-name\>&execution=\<execution-name\> | -- |
| Start a new training process | /\<stage\>/training | POST | stateMachine=\<state-machine-name\> | see details |
| _Analysis_ | | | | |
| Get a list of analysis process statuses | /\<stage\>/analyze | GET | stateMachine=\<state-machine-name\> | -- |
| Get a specific analysis process status | /\<stage\>/analyze | GET | stateMachine=\<state-machine-name\>&execution=\<execution-name\> | -- |
| Start a new analysis process | /\<stage\>/analyze | POST | stateMachine=\<state-machine-name\> | see details |
| _Model_ | | | | |
| Get a list of Amazon Rekognition Custom Labels models | /\<stage\>/model | GET | -- | -- |
| Stop a running Amazon Rekognition Custom Labels model | /\<stage\>/model | POST | -- | see details |
| _Team_ | | | | |
| Get a list of current members of the labeling team  | /\<stage\>/team | GET | teamName=\<team-name\> | -- |
| Add members to the labeling team  | /\<stage\>/team | POST | -- | see details |
| Remove a member from the labeling team  | /\<stage\>/team | DELETE | teamName=\<team-name\>&member=\<email\> | -- |


where **\<stage\>** is a named reference to an [Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-stages.html) deployment created by the solution.

__

### Get a list of training process statuses

**API**

```
/<stage>/training?stateMachine=<state-machine-name>

```


**Method**

```
GET
```

**Request**

The request is sent to the lambda function where it calls [AWS Step Functions ListExecutions](https://docs.aws.amazon.com/step-functions/latest/apireference/API_ListExecutions.html) to enumerate a list of executions. By default, it gets the 20 most recent executions.


**Query parameter**

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| stateMachine | state machine name | required | State Machine is created the CFN stack |
| maxResults | maximum results to return | optional | Default is set to 20 |
| token | string | optional | A token is returned from the previous GET call if there are more results. It is used to page the next set of results. |
| filter | RUNNING, SUCCEEDED, FAILED, TIMED_OUT, or ABORTED | optional | If specified, filter by execution status |
| execution | execution name | optional | Use to get a specific execution status. See more detail later |

For example,

```
/<stage>/training?stateMachine=ml9804-1234-gt-labeling-job

```

**Response**

The response is list of executions returned from [AWS Step Functions DescribeExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html) API that contains detail information of each execution.

```json
{
    "executions": [
        {
            "executionArn": "<execution-arn>",
            "stateMachineArn": "<state-machine-arn",
            "name": "<execution-name>",
            "status": "SUCCEEDED",
            "startDate": "2020-06-11T07:17:32.315Z",
            "stopDate": "2020-06-11T07:18:08.462Z",
            "input": "<JSON string of the input>",
            "output": "<JSON string of the output>"
        },
        ...
    ],
    "nextToken": "<next-token-if-more-executions>"
}

```

__

### Get a specific training process status

**API**

```
/<stage>/training?stateMachine=<state-machine-name>&execution=<execution-name>

```


**Method**

```
GET
```

**Request**

The request is sent to the lambda function where it calls [AWS Step Functions DescribeExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html) and [GetExecutionHistory](https://docs.aws.amazon.com/step-functions/latest/apireference/API_GetExecutionHistory.html) to describe the specific execution.


**Query parameter**

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| stateMachine | state machine name | required | State Machine is created the CFN stack |
| execution | execution name | required | Use to get a specific execution status. See more detail later |

For example,

```
/<stage>/training?stateMachine=ml9804-1234-gt-labeling-job?execution=execution-1234

```

**Response**

The response is list of executions returned from [AWS Step Functions DescribeExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html) API and contained detail information of each execution.

```json
{
    "executionArn": "<execution-arn>",
    "stateMachineArn": "<state-machine-arn>",
    "name": "<execution-name>",
    "status": "SUCCEEDED",
    "startDate": "2020-06-11T07:17:32.315Z",
    "stopDate": "2020-06-11T07:18:08.462Z",
    "input": "<JSON string of the input>",
    "output": "<JSON string of the output>"
}

```

__


### Start a new training process

**API**

```
/<stage>/training?stateMachine=ml9804-1234-gt-labeling-job
```

**Method**

```
POST
```

**Request**

The request is sent to the lambda function where it calls [AWS Step Functions StartExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html) API to start the analysis state machine execution.

```json
{
    "input": {
        "bucket": "<source-bucket>",
        "keys": [
            "path/image.jpg",
            "path/video.mp4"
        ],
        "projectName": "<project-name>",
        "trainingType": "object",
        "labels": [
            "Label 1",
            "Label 2"
        ],
    }
}

```

where

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| input.bucket | bucket name | required | the Amazon S3 **source** bucket created by the CFN stack |
| input.keys | an array of keys | required | the S3 object key of the video file |
| input.projectName | unique training project name | required | project name is used as a prefix for the labeling job and training model |
| input.trainingType | object or concept | required | specify **object** to train an object detection model. Specify **concept** to train an image classification model |
| input.labels | an array of labels | required | a list of label names to label your dataset and training a model |

**Response**

```json
{
    "executionArn": "<execution-arn>",
    "stateMachineArn": "<state-machine-arn>",
    "name": "<execution-name>",
    "status": "SUCCEEDED",
    "startDate": "2020-06-11T07:17:32.315Z",
    "stopDate": "2020-06-11T07:18:08.462Z",
    "input": "<JSON string of the input>",
    "output": "<JSON string of the output>"
}

```

__

### Get a list of analysis process statuses

**API**

```
/<stage>/analyze?stateMachine=<state-machine-name>

```


**Method**

```
GET
```

**Request**

The request is sent to the lambda function where it calls [AWS Step Functions ListExecutions](https://docs.aws.amazon.com/step-functions/latest/apireference/API_ListExecutions.html) to enumerate a list of executions. By default, it gets the 20 most recent executions.


**Query parameter**

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| stateMachine | state machine name | required | State Machine is created the CFN stack |
| maxResults | maximum results to return | optional | Default is set to 20 |
| token | string | optional | A token is returned from the previous GET call if there are more results. It is used to page the next set of results. |
| filter | RUNNING, SUCCEEDED, FAILED, TIMED_OUT, or ABORTED | optional | If specified, filter by execution status |
| execution | execution name | optional | Use to get a specific execution status. See more detail later |

For example,

```
/<stage>/analyze?stateMachine=ml9804-1234-analysis

```

**Response**

The response is list of executions returned from [AWS Step Functions DescribeExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html) API that contains detail information of each execution.

```json
{
    "executions": [
        {
            "executionArn": "<execution-arn>",
            "stateMachineArn": "<state-machine-arn",
            "name": "<execution-name>",
            "status": "SUCCEEDED",
            "startDate": "2020-06-11T07:17:32.315Z",
            "stopDate": "2020-06-11T07:18:08.462Z",
            "input": "<JSON string of the input>",
            "output": "<JSON string of the output>"
        },
        ...
    ],
    "nextToken": "<next-token-if-more-executions>"
}

```
__

### Get a specific analysis process status

**API**

```
/<stage>/analyze?stateMachine=<state-machine-name>?execution=<execution-name>

```


**Method**

```
GET
```

**Request**

The request is sent to the lambda function where it calls [AWS Step Functions DescribeExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html) and [GetExecutionHistory](https://docs.aws.amazon.com/step-functions/latest/apireference/API_GetExecutionHistory.html) to describe the specific execution.


**Query parameter**

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| stateMachine | state machine name | required | State Machine is created the CFN stack |
| execution | execution name | required | Use to get a specific execution status. See more detail later |

For example,

```
/<stage>/analyze?stateMachine=ml9804-1234-analysis?execution=execution-1234

```

**Response**

The response is list of executions returned from [AWS Step Functions DescribeExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html) API and contained detail information of each execution.

```json
{
    "executionArn": "<execution-arn>",
    "stateMachineArn": "<state-machine-arn",
    "name": "<execution-name>",
    "status": "SUCCEEDED",
    "startDate": "2020-06-11T07:17:32.315Z",
    "stopDate": "2020-06-11T07:18:08.462Z",
    "input": "<JSON string of the input>",
    "output": "<JSON string of the output>"
}

```

__

### Start a new analysis process

**API**

```
/<stage>/analyze?stateMachine=ml9804-1234-analysis
```

**Method**

```
POST
```

**Request**

The request is sent to the lambda function where it calls [AWS Step Functions StartExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html) API to start the analysis state machine execution.

```json
{
  "input": {
    "bucket": "<source-bucket>",
    "key": "path/video.mp4",
    "projectArn": "<project-arn>",
    "projectVersionArn": "<specific-project-version-arn>",
    "inferenceUnits": 4
  }
}
```

where

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| input.bucket | bucket name | required | the Amazon S3 **source** bucket created by the CFN stack |
| input.key | s3 object key | required | the S3 object key of the video file |
| projectArn | arn | required | The ARN of your Amazon Rekognition Custom Labels project |
| projectVersionArn | arn | required | The ARN of the specific project version of your Amazon Rekognition Custom Labels model |
| inferenceUnits | number | required | number of inferences to start |

**Response**

```json
{
    "executionArn": "<execution-arn>",
    "stateMachineArn": "<state-machine-arn>",
    "name": "<execution-name>",
    "status": "SUCCEEDED",
    "startDate": "2020-06-11T07:17:32.315Z",
    "stopDate": "2020-06-11T07:18:08.462Z",
    "input": "<JSON string of the input>",
    "output": "<JSON string of the output>"
}

```

__

### Get a list of Amazon Rekognition Custom Labels models

**API**

```
/<stage>/model

```


**Method**

```
GET
```

**Request**

The request is sent to the lambda function where it calls [AWS Step Functions ListExecutions](https://docs.aws.amazon.com/step-functions/latest/apireference/API_ListExecutions.html) to enumerate a list of executions. By default, it gets the 20 most recent executions.


**Query parameter**

None

**Response**

The response is list of models returned from [AWS Step Functions DescribeExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html) API that contains detail information of each execution.

```json
[
  {
    "name": "model_01",
    "projectArn": "<project-arn>",
    "versions": [
      {
        "name": "model_version_01",
        "projectVersionArn": "<specific-project-version-arn>",
        "createdAt": 1588095878479,
        "status": "STOPPED"
      }
    ]
  },
  ...
]

```

__

### Stop a running Amazon Rekognition Custom Labels model

**API**

```
/<stage>/model
```

**Method**

```
POST
```

**Request**

The request is sent to the lambda function where it calls [AWS Step Functions StartExecution](https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html) API to start the analysis state machine execution.

```json
{
    "action": "stop",
    "projectVersionArn": "<specific-project-version-arn>"
}

```

where

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| action | stop | required | action to perform. Only support 'stop' |
| projectVersionArn | arn string | required | ARN of the specific project version of Amazon Rekognition Custom Labels model |

**Response**

None

__

### Get a list of current members of the labeling team

**API**

```
/<stage>/team?teamName=<team-name>

```


**Method**

```
GET
```

**Request**

The request is sent to the lambda function where it calls Amazon Cognito to list users from the user group (teamName).


**Query parameter**

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| teamName | labeling team name | required | the team name refers to an user group of Amazon Cognito User Pool created by the solution |

For example,

```
/<stage>/team?teamName=ml9804-1234-team

```

**Response**

```json
[
    "worker1@email.com",
    "worker2@email.com"
]

```

__

### Add members to the labeling team

**API**

```
/<stage>/team
```

**Method**

```
POST
```

**Request**

The request is sent to the lambda function where it calls Amazon Cognito service to create an user.

```json
{
    "teamName":"ml9804-1234-team",
    "members":[
        "worker001@email.com",
        "worker002@email.com"
    ]
}

```

where

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| teamName | team name | required | an Amazon Cognito User Pool user group that attached to Amazon SageMaker Ground Truth Private Workteam |
| members | an array of email addresses | required | a list of email addresses to add to the labeling team |


**Response**

```json
[
    "worker001@email.com",
    "worker002@email.com"
]

```

__

### Remove a member from the labeling team

**API**

```
/<stage>/team?teamName=<team-name>&member=<email-address>
```

**Method**

```
DELETE
```

**Request**

The request is sent to the lambda function where it calls Amazon Cognito to delete the user from the user group (teamName).

**Query parameter**

| Key | Value | Mandatory | Description |
|:--- |:------|:----------|:------------|
| teamName | labeling team name | required | the team name refers to an user group of Amazon Cognito User Pool created by the solution |
| member | email address | required | an email address of the member to be removed |

For example,

```
/<stage>/team?teamName=ml9804-1234-team&member=worker0001@email.com

```

**Response**

```json
"worker001@email.com"

```

___

## Security

HTTPS request is authenticated with a valid AWS crendential. Upon sign in to the web portal, Amazon Cognito issues a temporary AWS security credential to the authenticated user to access limited AWS resources.

### IAM Role given to an Authenticated Amazon Cognito User
The authenicated user is given access to **invoke** the RESTful API endpoint and GetObject, PutObject, and ListBucket to the **source** S3 bucket.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "cognito-identity:GetId",
            "Resource": "arn:aws:cognito-identity:<region>:<account>:identitypool/<region>:<guid>",
            "Effect": "Allow"
        },
        {
            "Action": "execute-api:Invoke",
            "Resource": "arn:aws:execute-api:<region>:<account>:<api-id>/*/*/*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::<source-bucket>",
                "arn:aws:s3:::<source-bucket>/*"
            ],
            "Effect": "Allow"
        }
    ]
}
```
__

### IAM Role used by the API backend Lambda Function
The backend API lambda function is given the following permission to access specific AWS resources including Amazon S3 source bucket for getting and putting objects, AWS Step Functions traning and analysis state machines for starting and describing executions, Amazon Rekognition Custom Labels for describing and stopping a model and Amazon Cognito User Pool of the labeling team for managing label team member.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:<region>:<account>:log-group:/aws/lambda/*",
            "Effect": "Allow"
        },
        {
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::<source-bucket>",
            "Effect": "Allow"
        },
        {
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::<source-bucket>/*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "states:DescribeStateMachine",
                "states:StartExecution",
                "states:ListExecutions"
            ],
            "Resource": [
                "arn:aws:states:<region>:<account>:stateMachine:ml9804-<stack-id>-gt-labeling-job",
                "arn:aws:states:<region>:<account>:stateMachine:ml9804-<stack-id>-analysis"
            ],
            "Effect": "Allow"
        },
        {
            "Action": [
                "states:DescribeExecution",
                "states:StopExecution",
                "states:GetExecutionHistory"
            ],
            "Resource": [
                "arn:aws:states:<region>:<account>:execution:ml9804-<stack-id>-gt-labeling-job:*",
                "arn:aws:states:<region>:<account>:execution:ml9804-<stack-id>-analysis:*"
            ],
            "Effect": "Allow"
        },
        {
            "Action": "sagemaker:DescribeWorkteam",
            "Resource": "arn:aws:sagemaker:<region>:<account>:workteam/ml9804-<stack-id>-team",
            "Effect": "Allow"
        },
        {
            "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminDeleteUser",
                "cognito-idp:AdminAddUserToGroup",
                "cognito-idp:AdminRemoveUserFromGroup",
                "cognito-idp:ListUsersInGroup"
            ],
            "Resource": "arn:aws:cognito-idp:<region>:<account>:userpool/<label-team-pool-id>",
            "Effect": "Allow"
        },
        {
            "Action": [
                "sns:ListSubscriptionsByTopic",
                "sns:Subscribe"
            ],
            "Resource": "arn:aws:sns:<region>:<account>:ml9804-<stack-id>-labeling-topic",
            "Effect": "Allow"
        },
        {
            "Action": "sns:Unsubscribe",
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": "rekognition:DescribeProjects",
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": "rekognition:DescribeProjectVersions",
            "Resource": "arn:aws:rekognition:<region>:<account>:project/*/*",
            "Effect": "Allow"
        },
        {
            "Action": "rekognition:StopProjectVersion",
            "Resource": "arn:aws:rekognition:<region>:<account>:project/*/version/*/*",
            "Effect": "Allow"
        }
    ]
}
```

___

Next to [Training State Machine](../gt-labeling/README.md) | Back to [README](../../README.md)
