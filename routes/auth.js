var express = require('express');
var crypto = require('crypto');
var router = express.Router();

var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/users');
var Schema = mongoose.Schema;
var Users = new Schema({
   username: String,
   password: String,
   surname: String,
   firstname: String
   });

mongoose.model('User', Users);


var User = mongoose.model('User');

// 認証設定
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

// シリアライズ方法の設定
passport.serializeUser(function(user, done) {
  console.log("serializeUser");
  console.dir(user);
  done(null, user);
});

// デシリアライズ方法の設定
passport.deserializeUser(function(user, done) {
  console.log("deserializeUser");
  console.dir(user);
  done(null, user);
});

passport.use(new LocalStrategy(
	function(username, password, done) {
		User.findOne({ username: username }, function(err, user) {
			if (err) { return done(err); }
			if (!user) {
				return done(null, false, { message: 'ユーザーIDが間違っています。' });
			}
			var digest = toHexDigest(password);
			if(user.password !== digest){
				return done(null, false, { message: 'パスワードが間違っています。' });
			}
			return done(null, user);
		});
	}
));

// ログイン画面表示
router.get('/login', function(req, res) {
  res.render('login', { title: 'Express', message : '' });
});

// ログイン処理
router.post('/login',
  passport.authenticate('local', { successRedirect: '/',
                                   failureRedirect: '/auth/login',
                                   failureFlash: true })
);

// ログアウト処理
router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// ユーザー登録画面表示
router.get('/create-user', function(req, res) {
	res.render('create-user', { title: 'Express', message : '' });
});

// ユーザー情報画面表示
router.get('/user/:username', function(req, res) {
	var username = req.params.username;
	console.log(":username="+username);
	User.findOne({ username: username }, function(err, user) {
		if (err) { return done(err); }
		if (!user) {
			return done(null, false, { message: 'ユーザーIDが間違っています。' });
		}
		var user = {
			username: username,
			surname: user.surname,
			firstname: user.firstname
		};
		res.render('edit-user', user);
	});	
});


// ユーザー削除処理
router.get('/delete/:username', function(req, res) {
	var username = req.params.username;
	if(username){
		console.log("削除対象[" + username + "]");
		User.remove({ username: username }, function(err, user) {
			if (err) { return done(err); }
			if (!user) {
				return done(null, false, { message: '削除に失敗しました。' });
			} else {
				res.redirect('/');
			}
		});
	} else {
		console.log("IDが指定されていないため削除処理を実行しません。[" + username + "]");
		res.redirect('/');
	}
});

// ユーザー一覧画面表示
router.get('/users', function(req, res) {
	User.find({}, function(err, users0) {
		var users = [];
		for (var i = 0; i < users0.length; i++) {
			users.push({
				username: users0[i].username,
				surname: users0[i].surname,
				firstname: users0[i].firstname
			});
		}
		res.render('user-list', { users: users });
	});
});

// パスワードのハッシュを計算する。
function toHexDigest(password){
	var sha256sum = crypto.createHash('sha256');
	sha256sum.update(password);
	var digest = sha256sum.digest('hex');
	return digest;
}

// ユーザ登録処理
router.post('/user', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	console.log("create user:"+username+","+password);
	var digest = toHexDigest(password);
	var user = new User();
	user.username = username;
	user.password = digest;
	user.surname = req.body.surname;
	user.firstname = req.body.firstname;
	user.save(function(err){
		if(err) {
			console.log(err);
			throw err;
		}
	});
	console.log('User saved['+username+']');
	res.redirect('/');
});

// ユーザ情報更新処理
router.post('/updateUser', function(req, res) {
	var username = req.body.username;
	var surname = req.body.surname;
	var firstname = req.body.firstname;
	console.log('更新ユーザーID['+username+']');
	console.log("update user:"+username+","+surname+","+firstname);
	var modified = {username: username, surname: surname, firstname:firstname};
	User.findOneAndUpdate({username:username}, modified, function (err, place) {
	if(err){
	console.log(err);
	} else {
		res.redirect('/');
	}
	});	
});

module.exports = router;
