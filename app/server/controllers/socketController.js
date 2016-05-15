
var r = require('rethinkdb');
var server = require('../server').server;
var _ = require('lodash');
var connection = null;

var rConnectConfig;

var rConnectConfig = { host: process.env.RETHINK_PORT_8080_TCP_ADDR || 'localhost' , db: 'apiTables' };

r.connect(rConnectConfig, function(err, conn) {
  if (err) { console.log(err); }
  connection = conn;
  console.log("This is the connection: ", connection)
});

var socketMethods = {

  addNode: function(node) {
    var tablename = node.username + '_' + node.tablename;
    r.db('apiTables').table(tablename).insert(node.values).run(connection, function(err, response) {
      if (err) { console.log('There was error adding to ' + tablename); }
      console.log('Added node to ' + tablename);
    })
  },

  editNode: function(node) {
    var tablename = node.username + '_' + node.tablename;
    r.table(tablename).get(node.rowId).update(node.values).run(connection, function(err, results) {
      if (err) { console.log('There was error updating to ' + tablename); }
      console.log('Edited node on ' + tablename);
    })
  },

  removeNode: function(node) {
    var tablename = node.username + '_' + node.tablename;
    r.table(tablename).get(node.rowId).delete().run(connection, function(err, results) {
      if (err) { console.log('There was error deleting node from ' + tablename); }
      console.log('Removed node from ' + tablename);
    })
  },

  getTableAndOpenConnection: function(req, res) {
    var io = require('../server').io;
    var tablename = req.params.tablename;
    var emitmessage = 'update ' + tablename;

    var data = {
      columns: [],
      name: tablename.split('_')[1],
      children: []
    };

    r.table(tablename).run(connection, function(err, cursor) {
      if (err) { console.log(err); }
      cursor.toArray(function(err, results) {
        _.each(results[0], function(value, key) {
          if (key !== 'id') {
            data.columns.push(key);
          }
        })
        _.each(results, function(row) {
      		var rowObject = {
      			children: []
      		};
      		_.each(row, function(value, key) {
      			if (key === 'id') {
              rowObject.name = value.slice(0,4);
      				rowObject.id = value;
      			} else {
      				var object = {};
      				object.name = value;
      				rowObject.children.push(object);
      			}
      		})
      		data.children.push(rowObject);
      	})

				r.table(tablename).changes().run(connection, function(err, cursor) {
					if (err) { console.log(err); }
					cursor.each(function(err, node) {
            if (node && node.new_val) {
              io.emit(emitmessage, node);
            }
					})
				});

				res.status(200).send(data);
      });
    });
	}
};

module.exports = socketMethods;
