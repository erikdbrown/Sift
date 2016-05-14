var client = require('../utils/dbconnect').client;
var r = require('rethinkdb');
var socketController = require('./socketController')
var faker = require('faker');
var _ = require('lodash');
var utils = require('../utils/utils.js');
var config = require('../server.js');
var connection = null;

var rConnectConfig = { host: process.env.RETHINK_PORT_8080_TCP_ADDR || 'localhost' , db: 'apiTables' };

r.connect(rConnectConfig, function(err, conn) {

  if (err) { console.log(err); }
  connection = conn;
  r.dbCreate('apiTables').run(conn, function(err, conn) {
    console.log('Tables DB created in RethinkDB')
  });
});

dbMethods = {

/////////POST///////////

///SAMPLE QUERY///
/*
{"tableName": "mytable",
    "Name.firstName": "yes",
    "Name.lastName": "yes",
    "Address.streetAddress": "yes"
}
//dataIndex = all of our data
{ tableName: 'yoniTable',
  name: {
    firstName: true,
    lastName: true},
  company: {
    catchPhrase: true}
}
*/

  // this method creates a new table with generated data
  createUserTable: function(req, res) {
    //retrieve user from session store
    var userID = req.user.id;
    var columns = req.body.columns || utils.parseColumnNames(req.body); // custom request have a columns property.
    var tablename = req.user.username + '_' + req.body.tablename;
    var custom = req.body.custom || false;
    var columnsString, fakeData;

    // create the table in RethinkDB

    // check postgres first to see if tablename exists
    client.query('SELECT tablename FROM tables WHERE userid = ($1) AND tablename = ($2)', [userID, tablename], function(err, response) {
      if (response.rows.length > 0) {
        res.status(400).send({ message: 'Table already exists' }) // table already exists

      } else {
        r.db('apiTables').tableCreate(tablename).run(connection, function(err, result) {
          // handle custom table
          if (custom) {
            columnsString = Object.keys(columns).join(',');
            dbMethods.addToPostgresTables(userID, tablename, columnsString, custom, function(err) {
              if (err) { utils.handleError(err); }
              res.sendStatus(200);
            })
          // create table and add generated data
          } else {
            fakeData = utils.generateData(req.body, columns, 20, function(data) {
              columnsString = columns.join(',');
              dbMethods.addToPostgresTables(userID, tablename, columnsString, custom, function(err) {
                if (err) { utils.handleError(err); }
                dbMethods.addFakeData(tablename, data, function(err) { // returns an array of 20 JSONs [{ firstname: "Erik", lastname: "Brown", catchPhrase: "Verdant Veranda FTW"}, ...];
                  if (err) { utils.handleError(err); }
                  res.sendStatus(200);
                })
              });
            });
          }
        });
      }
    })
  },

  addToPostgresTables: function(userID, tablename, columns, custom, cb) {
    client.query('INSERT INTO Tables (userID, tablename, columns, custom) VALUES ($1, $2, $3, $4)', [userID, tablename, columns, custom], function(err, response){
      cb(err);
    })
  },

  addFakeData: function(tablename, fakeData, cb) {
    r.db('apiTables').table(tablename).insert(fakeData).run(connection, function(err, response) {
      cb(err);
    });
  },

  // this method retrieves all the tableNames associated with the passed in username
  getTables: function(req, res) {
    var userID = req.user.id;

    var queryString = 'SELECT id, tablename, columns, active FROM tables WHERE userID = ' + userID;
    client.query(queryString, function(err, tableNames){
        if (err) { console.log(err); }
        _.each(tableNames.rows, function(row) {
          row.columns = row.columns.split(',')
        })
        res.status(200).json(tableNames.rows);
    });
  },

  // this method retrieves all the rows in the table specified from the query param
  getOneTable: function(req, res) {
    var tablename = req.params.username + '_' + req.params.tablename;
    r.table(tablename).run(connection, function(err, cursor) {
      if (err) { console.log(err); }
      dbMethods.checkandUpdateTimestamp(tablename); 
      cursor.toArray(function(err, results) {
        res.status(200).send(results);
      });
    });
  },

 // this posts to a users tables. The front-end sends a post request with the columns and new values
 // {columnName: value, column2Name: value, ...}
  postToTable: function(req, res) {

    var tablename = req.params.username + '_' + req.params.tablename;
    var columns;
    var queryString = 'SELECT custom, datatypes, columns, last_used FROM tables WHERE tablename = ($1)';
    client.query(queryString, [tablename], function(err, results) {

      var savedTimestamp = results.rows[0].last_used;
      dbMethods.checkandUpdateTimestamp(tablename, savedTimestamp);

      if (results.rows[0].custom) {
        var dbColumns = results.rows[0].columns;
        var dbDataTypes = results.rows[0].datatypes;

        dbMethods.matchDataTypes(req.body, dbColumns, dbDataTypes, function(err, passes) {
          if (passes) {

            r.table(tablename).insert(req.body).run(connection, function(err, response) {
              if (err) { console.log(err); }
              res.sendStatus(200);
            });

          } else {
            var errorMessage = 'Incorrect data type for ' + err.column + '. Expected: ' + err.expected + '. Received: ' + err.received;
            res.status(400).send(errorMessage);
          }
        });

      } else {
        r.table(tablename).insert(req.body).run(connection, function(err, response) {
          if (err) { console.log(err); }
          res.sendStatus(200);
        });
      }
    })

  },

  checkandUpdateTimestamp: function(tablename, savedTimestamp) {
    var lastUpdate;
    var rightNow = new Date();

    if (!savedTimestamp) {
      var queryString = 'SELECT last_used FROM tables WHERE tablename = ($1)'
      client.query(queryString, [tablename], function(err, results) {
        lastUpdate = results.rows[0].last_used;

        if (rightNow - lastUpdate > 86400000) {
          var queryString = 'UPDATE tables SET last_used = current_date WHERE tablename = ($1)';
          client.query(queryString, [tablename], function(err, results) {
            if (err) { console.log(err); }
          });
        }
      })
    } else {
      lastUpdate = new Date(savedTimestamp);
      if (rightNow - lastUpdate > 86400000) {
        var queryString = 'UPDATE tables SET last_used = current_date WHERE tablename = ($1)';
        client.query(queryString, [tablename], function(err, results) {
          if (err) { console.log(err); }
        });
      }
    }
  },

  matchDataTypes: function(reqColumns, columns, datatypes, callback) {
    columns = columns.split(',');
    datatypes = datatypes.split(',')
    var columns_types = {};

    _.each(columns, function(column, index) {
      columns_types[column] = datatypes[index];
    });
  },

  ///////////PUT/////////// updates a row in a column
  updateValue: function(req, res) {
    var tablename = req.params.username + '_' + req.params.tablename;
    var rowId = req.params.rowId;

    var columnName = req.body.columnName;
    var newValue = req.body.newValue
    var update = {};
    update[columnName] = newValue;

    r.table(tablename).get(rowId).update(update).run(connection, function(err, results) {
      if (err) { console.log(err); }
      dbMethods.checkandUpdateTimestamp(tablename);
      res.sendStatus(200);
    })
  },

  ///////////DELETE//////////
  // deletes a row from a users table. Needs the tablename, and a value and columName that corresponds with the roow to be deleted
  // eg {"tableName": "yoni_test","columnName": "lastname", "value": "lastname"}

  deleteRow: function(req, res) {
    var tablename = req.params.username + '_' + req.params.tablename;
    var rowId = req.params.rowId;

    r.table(tablename).get(rowId).delete().run(connection, function(err, results) {
      if (err) { console.log(err); }
      dbMethods.checkandUpdateTimestamp(tablename)
      res.sendStatus(200);
    })
  },

  // deletes a users table. Needs the tableName eg {"tableName": "yoni_test"}
  // returns the table that was deleted.
  deleteTable: function(req, res) {
    // hardcoded for testing
    var username = req.user.username;
    var userId = req.user.id;
    var tableId = req.params.id

    client.query('SELECT tablename FROM Tables WHERE id = ' + tableId, function(err, results) {
      if (err) { console.log(err); }
      if (results.rows.length === 0) {
        res.sendStatus(404);
      }
      tablename = results.rows[0].tablename;
      client.query('DELETE FROM Tables WHERE userID = ' + userId + ' AND id = ' + tableId, function(err, entireTable) {
        if (err) { console.log(err); }
        var deletedTable = entireTable.rows;

        r.db('apiTables').tableDrop(tablename).run(connection, function(err, results) {
          if (err) { console.log(err); }
          res.sendStatus(200);
        });
      });
    });
  }
};

module.exports = dbMethods;
