const bluebird = require('bluebird');
const redis = require('redis');

bluebird.promisifyAll(redis);

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  // password: process.env.REDIS_PASS || 'password',
});

console.log('redis.js >> redis host', process.env.REDIS_HOST)
console.log('redis.js >> redis port', process.env.REDIS_PORT)
console.log('redis.js >> redis password', process.env.REDIS_PASS)

module.exports = client;
