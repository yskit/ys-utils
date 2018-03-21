const path = require('path');

exports.load = filepath => {
  try {
    const extname = path.extname(filepath);
    if (!['.js', '.node', '.json', ''].includes(extname)) {
      return fs.readFileSync(filepath);
    }
    const obj = require(filepath);
    if (!obj) return obj;
    if (obj.__esModule) return 'default' in obj ? obj.default : obj;
    return obj;
  } catch (err) {
    err.message = `load file: ${filepath}, error: ${err.message}`;
    throw err;
  }
}