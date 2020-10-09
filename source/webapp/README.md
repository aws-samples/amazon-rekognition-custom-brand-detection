# Webapp Component

The web application is written in ES6 and uses JQuery and Boostrap libraries.

___

# Limitations

The solution is designed to demonstrate how you can train a Machine Learning model to recognize a specific brand, an object, or a scene type without Machine Learning expertise by using Amazon SageMaker Ground Truth to prepare your training dataset and Amazon Rekognition Custom Labels to train and deploy the model. While the solution is fully functionaly, it is **not** meant to be production ready. However, the solution does provide the best practice of how to use and integrate multiple AWS services.

There are limitations with the web application:
* The webapp uses a 3-minutes timer to periodically polls the state machine executions' status through the RESTful API. Thus, the status is not updated in real-time. For real-time update, we highly recommend to use our Pub/Sub services such as [AWS AppSync](https://aws.amazon.com/appsync/), [Amazon MQ](https://aws.amazon.com/amazon-mq/?amazon-mq.sort-by=item.additionalFields.postDateTime&amazon-mq.sort-order=desc), or [AWS IoT Core](https://aws.amazon.com/iot-core/).
* The temporary security credential issued by Amazon Cognito expires every hour. The webapp doesn't automatically refresh the security credential. If you experience timeout error, **reload** the page.

___

# Security

When you build systems on AWS infrastructure, security responsibilities are shared between you and AWS. This shared model can reduce your operational burden as AWS operates, manages, and controls the components from the host operating system and virtualization layer down to the physical security of the facilities in which the services operate. For more information about security on AWS, visit the [AWS Security Center](https://aws.amazon.com/security).

## Subresource Integrity (SRI)
Web application assets are secured using Subresource Integrity (SRI). Input/output encoding are performed to prevent Cross Site Scripting (XSS) attack.

Sign-in flow uses [Amazon Cognito](https://aws.amazon.com/cognito/) service to authenticate user.

HTTPS requests requires [AWS Signature V4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html).

___

Retun to [README](../../README.md)
