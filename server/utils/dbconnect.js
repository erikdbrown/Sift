var pg = require('pg');
// var r = require('rethinkdb');
var connectionString = process.env.DATABASE_URL || 'postgres://seraph@localhost:5432/sift',

// postgres connection
client = new pg.Client(connectionString);
client.connect();

// create the Users table
client.query('CREATE TABLE IF NOT EXISTS Users (' +
  'id SERIAL PRIMARY KEY, ' +
  'username VARCHAR(120), ' +
  'displayname VARCHAR(120), ' +
  'password VARCHAR(60) DEFAULT null,' +
  'email VARCHAR(120), ' +
  'salt VARCHAR(60) DEFAULT null,' +
  'githubtoken VARCHAR(60) DEFAULT false )', function(err, result) {
    if (err) { throw new Error(err); }
    console.log('Users table created');
})

client.query('CREATE TABLE IF NOT EXISTS Tables (' +
	'id SERIAL PRIMARY KEY, ' +
  'userID INTEGER, ' +
  'columns VARCHAR(200), ' +
  'tablename VARCHAR(120) )', function(err, result) {
    if (err) { throw new Error(err); }
    console.log('"Tables" table created');
})

module.exports = {
	client: client
}
