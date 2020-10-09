const PATH = require('path');

module.exports = {
  PATH: PATH.join(__dirname, 'bin'),
  LD_LIBRARY_PATH: PATH.join(__dirname, 'lib'),
};
