var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require("connect-flash");
var passport = require('passport');
var session = require('express-session');

var routes = require('./routes/index');
var users = require('./routes/users');
var auth = require('./routes/auth');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({secret: 'secret'})); //expressのsessionミドルウェアを有効にしてsecretを設定
app.use(flash());
app.use(passport.initialize()); //passportの初期化
app.use(passport.session());

app.use('/', routes);
app.use('/users', users);
app.use('/auth', auth);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
/*
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/users');
var Schema = mongoose.Schema;
var Users = new Schema({
   username: String,
   password: String
   });
mongoose.model('User',Users);

var User = mongoose.model('User');

var user = new User();
	user.username = 'user01';
	user.password='passwd';
	user.save(function(err){
	if(err) {
		console.log(err);
		throw err;
	}
	console.log('User saved');
});
*/
/*
//mongoose.disconnect();
*/

module.exports = app;
