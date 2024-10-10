const NodeCache = require("node-cache");

// 30 Minutes Expired
const ttlSeconds = 1 * 60 * 30 * 100

const myCache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds * 0.2, useClones: false });

module.exports = myCache