var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');
var GitHubStrategy = require('passport-github').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var userController = require('./controllers/userController.js');
var socketController = require('./controllers/socketController.js');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var utils = require('./utils/utils')
var pg = require('pg');
var app = express();
var cors = require('cors');
var http = require('http');
var path = require('path');
var token = require('./auth/authTokens.js');


// Middleware. Add below as needed
// app.use(cors());
// app.use(morgan('dev'));
var port = process.env.PORT || 5001;

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
// app.use(express.static(__dirname + '/client/landingPage'))
require('./utils/routes.js')(app, express, utils.isAuth);

//===========uncomment this middleware for production=========
// app.use(express.static(path.join(__dirname, '../build')));

// http.createServer(app).listen(process.env.PORT || 3000, function() {
//   console.log('Listening on port ' + (process.env.PORT || 3000));
// });
// var server = app.listen(port, function() {
// 	console.log('Sifting on port= ', port)
// });

var server = http.createServer(app).listen(process.env.PORT || 5001, function() {
  console.log('Listening on port ' + (process.env.PORT || 5001 ));
});

var io = require('socket.io')(server);

io.on('connection', function(socket) {
	console.log('user connected.')

	socket.on('edit', function(node) {
		// edit node and send data back to client
		socketController.editNode(node);
	});

	socket.on('add', function(node) {
		console.log('Add triggered')
		// add node to database and send data back to client
		socketController.addNode(node);
	});

	socket.on('remove', function(node) {
		// delete node from database and send data back to client
		socketController.removeNode(node);
	});

  socket.on('disconnect', function(){
  	console.log('user disconnected.')
  });
});

passport.serializeUser(function(user, done) {
  done(null, user.email);
});

passport.deserializeUser(function(email, done) {
	userController.findUser(email, function(err, user) {
		done(err, user);
	});
});

passport.use(new GitHubStrategy({
    clientID: process.env.CLIENT_ID || token.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET || token.CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK || "http://localhost:5001/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
  	userController.findOrCreateGitHubUser(profile, accessToken, refreshToken, function(err, user) {
  		done(err, user);
  	})
  }
));

passport.use(new LocalStrategy(
	function(username, password, done) {
		userController.findUser(username, function(err, user) {
			if (err) { done(err); }
			if (!user) {
				done(null, false) // user does not exist
			} else {
				if (user.githubtoken !== 'false') {
					done(null, false, { message: 'Please sign in with your GitHub account.' })
				} else {
					userController.validatePassword(user.password, password, function(matched) {
						if (matched) {
							done(null, user);
						} else {
							done(null, false);
						}
					})
				}
			}
		})
}))

//===========//uncomment below for production//==========
//   app.get('*', function(req, res) {
//   console.log(path.join(__dirname, '../build/index.html'));
//   console.log(path.resolve(__dirname, '../build/index.html'));
//   res.sendFile(path.join(__dirname, '../build/index.html'));





module.exports = {
	app: app,
	io: io,
	server: server
};
