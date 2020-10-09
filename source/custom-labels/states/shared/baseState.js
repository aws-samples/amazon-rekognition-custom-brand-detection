const {
  mxBaseState,
} = require('core-lib');

class BaseState extends mxBaseState(class {}) {
  sanityCheck() {
    const src = this.input;
    if (!src) {
      throw new Error('missing input');
    }
    if (!src.bucket || !src.key || !src.labelingJobName) {
      throw new Error('missing bucket, key, or labelingJobName');
    }
  }
}

module.exports = BaseState;
