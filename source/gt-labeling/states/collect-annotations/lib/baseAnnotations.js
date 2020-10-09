const AWS = require('aws-sdk');
const {
  States,
  mxBaseState,
  S3Utils,
} = require('core-lib');

class BaseAnnotations extends mxBaseState(class {}) {
  async process() {
    const output = await this.collectAnnotations();
    this.setOutput(States.CollectAnnotations, output);
    return super.process();
  }

  async collectAnnotations() {
    throw new Error('subclass to implement');
  }

  async describeLabelingJob() {
    const prevState = this.output[States.StartLabelingJob];
    const labelingJobName = prevState.jobId.split('/').pop();
    const sagemaker = new AWS.SageMaker({
      apiVersion: '2017-07-24',
    });
    return sagemaker.describeLabelingJob({
      LabelingJobName: labelingJobName,
    }).promise();
  }

  async getOutputDataset(s3Uri) {
    const tmp = s3Uri.slice('s3://'.length).split('/');
    const bucket = tmp.shift();
    const key = tmp.join('/');
    return S3Utils.getObject(bucket, key)
      .then(data =>
        data.Body.toString().split('\n')
          .filter(x => x)
          .map(x => JSON.parse(x)));
  }
}

module.exports = BaseAnnotations;
