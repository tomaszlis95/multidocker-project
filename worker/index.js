const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  // If we ever lose connection to Redis, try to reconnect every 1 second
  retry_strategy: () => 1000
});
const sub = redisClient.duplicate();

function fib(index) {
  if (index < 2) return 1;
  // Recursion
  return fib(index - 1) + fib(index - 2);
}

// Whenever we get a new value, run this callback function
sub.on('message', (channel, message) => {
  // Store the calculated value in Redis
  redisClient.hset('values', message, fib(parseInt(message)));
});
// Whenever someone inserts a new value into Redis, run this callback function
sub.subscribe('insert');