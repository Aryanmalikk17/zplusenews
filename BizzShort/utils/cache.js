const NodeCache = require('node-cache');
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
module.exports = apiCache;
