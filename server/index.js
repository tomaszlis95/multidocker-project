const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Create express app
const app = express();
// Allow cross-origin requests
app.use(cors());
// Parse incoming requests of type application/json
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
// Create a new pool
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));
// Create a table called values with a single column called number
pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.log(err));

// Redis Client Setup
const redis = require('redis');

// Create a redis client
const redisClient = redis.createClient({
  // Hostname of the redis container
  host: keys.redisHost,
  // Default port for redis
  port: keys.redisPort,
  // Retry connection once every 1 second
  retry_strategy: () => 1000
});

// Create a duplicate redis client
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
  res.send('Hi');
});

// Get all values from Postgres
app.get('/values/all', async (req, res) => {
  // Get all rows from the values table
  const values = await pgClient.query('SELECT * from values');
  // Return the rows
  res.send(values.rows);
});

// Get all values from Redis
app.get('/values/current', async (req, res) => {
  // Get all keys from the redis client
  redisClient.hgetall('values', (err, values) => {
    // Return the values
    res.send(values);
  });
});

// Post a new value to Redis
app.post('/values', async (req, res) => {
  // Get the index from the request body
  const index = req.body.index;
  // If the index is greater than 40, return an error
  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }
  // Set the value of the index to 'Nothing yet!'
  redisClient.hset('values', index, 'Nothing yet!');
  // Publish the index to the redisPublisher
  redisPublisher.publish('insert', index);
  // Insert the index into the values table
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
  // Return a status of 200
  res.send({ working: true });
});

// Listen on port 5000
app.listen(5000, err => {
  console.log('Listening');
});