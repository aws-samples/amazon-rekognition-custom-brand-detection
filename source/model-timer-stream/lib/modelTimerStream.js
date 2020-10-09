const AWS = require('aws-sdk');

class ModelTimerStream {
  constructor(event, context) {
    this.$event = event;
    this.$context = context;
    this.$keys = undefined;
    this.$oldImage = undefined;
    this.$newImage = undefined;
  }

  static get Constants() {
    return {
      EventSource: 'aws:dynamodb',
      Event: {
        Insert: 'INSERT',
        Remove: 'REMOVE',
        Modify: 'MODIFY',
      },
    };
  }

  get event() {
    return this.$event;
  }

  get context() {
    return this.$context;
  }

  get eventName() {
    this.sanityCheck();
    return this.event.Records[0].eventName;
  }

  get dynamodb() {
    return this.event.Records[0].dynamodb;
  }

  get keys() {
    return this.$keys;
  }

  set keys(val) {
    this.$keys = val;
  }

  get oldImage() {
    return this.$oldImage;
  }

  set oldImage(val) {
    this.$oldImage = val;
  }

  get newImage() {
    return this.$newImage;
  }

  set newImage(val) {
    this.$newImage = val;
  }

  sanityCheck() {
    const record = ((this.event || {}).Records || [])[0] || {};
    if (!record.dynamodb || record.eventSource !== ModelTimerStream.Constants.EventSource) {
      throw new Error('invalid record');
    }
  }

  async process() {
    this.unmarshallData();
    if (this.eventName === ModelTimerStream.Constants.Event.Insert) {
      return this.onINSERT();
    }
    if (this.eventName === ModelTimerStream.Constants.Event.Remove) {
      return this.onREMOVE();
    }
    if (this.eventName === ModelTimerStream.Constants.Event.Modify) {
      return this.onMODIFY();
    }
    throw new Error(`invalid event, ${this.eventName}`);
  }

  async onINSERT() {
    return undefined;
  }

  async onMODIFY() {
    return undefined;
  }

  async onREMOVE() {
    return this.stopModelVersion();
  }

  unmarshallData() {
    this.keys = AWS.DynamoDB.Converter.unmarshall(this.dynamodb.Keys);
    if (this.dynamodb.OldImage) {
      this.oldImage = AWS.DynamoDB.Converter.unmarshall(this.dynamodb.OldImage);
    }
    if (this.dynamodb.NewImage) {
      this.newImage = AWS.DynamoDB.Converter.unmarshall(this.dynamodb.NewImage);
    }
  }

  async stopModelVersion() {
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    return rekog.stopProjectVersion({
      ProjectVersionArn: this.oldImage.projectVersionArn,
    }).promise()
      .then(data => console.log(JSON.stringify(data, null, 2)))
      .catch(e => console.error(e));
  }
}

module.exports = ModelTimerStream;
