var express = require('express');
var crypto = require('crypto');
var router = express.Router();

// passportのソースを参考にして、reqにロール取得関数を追加。
var http = require('http')
, req = http.IncomingMessage.prototype;
req.getRole = function(){
	if(this.user){
		return this.user.role;
	} else {
		return "";
	}
};

var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/users');
var Schema = mongoose.Schema;
var Users = new Schema({
   username: String,
   password: String,
   surname: String,
   firstname: String,
   role: String
   });

mongoose.model('User', Users);


var User = mongoose.model('User');

// 認証設定
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

// シリアライズ方法の設定
passport.serializeUser(function(user, done) {
  console.log("serializeUser");
  // TODO: パスワードをシリアライズしないようにする。
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
router.post('/login',  function(req, res, next){
	passport.authenticate('local', function(err, user, info) {
		if (err) {
			return next(err);
		}
		if (!user) {
		    res.message("認証に失敗しました。", "error");
		    return res.redirect('/auth/login');
		}
		req.logIn(user, function(err) {
			if (err) {
				return next(err);
			} else {
				res.message("ログインしました。", "info");
				return res.redirect('/');
			}
		});
	})(req, res, next);
});



// ログアウト処理
router.get('/logout', function(req, res){
  req.logout();
  res.message("ログアウトしました。", "info");
  res.redirect('/');
});

function isValid(req, res, validUser){
	// 認証されていなければfalseを返す。
	if(!req.isAuthenticated()){
		return false;
	}
	// 実行可能ユーザーが指定されている場合には、
	// ログインユーザーと一致する場合にはtrueを返す。それ以外の場合には、falseを返す。
	if(validUser){
		var loginUser = req.user.username;
		return validUser === loginUser;
	}
	if(req.getRole() === "admin") {
		return true;
	}
	return false;
}

// ユーザー登録画面表示
router.get('/create-user', function(req, res) {
	if(!isValid(req, res)){
		res.message("エラーが発生しました。", "error");
		return res.redirect('/');
	}
	res.render('create-user', { title: 'Express', message : '' });
});

// ユーザー情報画面表示
router.get('/user/:username', function(req, res) {
	var username = req.params.username;
	if(!isValid(req, res, username)){
		res.message("エラーが発生しました。", "error");
		return res.redirect('/');
	}

	console.log(":username="+username);
	User.findOne({ username: username }, function(err, user) {
		if (err) { return done(err); }
		if (!user) {
			return done(null, false, { message: 'ユーザーIDが間違っています。' });
		}
		var user = {
			username: username,
			surname: user.surname,
			firstname: user.firstname,
			role: user.role
		};
		res.render('edit-user', user);
	});
});


// ユーザー削除処理
router.get('/delete/:username', function(req, res) {
	if(!isValid(req, res)){
		res.message("エラーが発生しました。", "error");
		return res.redirect('/');
	}
	var username = req.params.username;
	if(username){
		console.log("削除対象[" + username + "]");
		User.remove({ username: username }, function(err, user) {
			if (err) { return done(err); }
			if (!user) {
				return done(null, false, { message: '削除に失敗しました。' });
			} else {
				res.message("ユーザーを削除しました。", "info");
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
	if(!isValid(req, res)){
		res.message("エラーが発生しました。", "error");
		return res.redirect('/');
	}
	User.find({}, function(err, users0) {
		var users = [];
		for (var i = 0; i < users0.length; i++) {
			users.push({
				username: users0[i].username,
				surname: users0[i].surname,
				firstname: users0[i].firstname,
				role: users0[i].role
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
console.log("USER CREATE");
	if(!isValid(req, res)){
		res.message("エラーが発生しました。", "error");
		return res.redirect('/');
	}
	var username = req.body.username;
	var password = req.body.password;
	console.log("create user:"+username+","+password);
	var digest = toHexDigest(password);
	var user = new User();
	user.username = username;
	user.password = digest;
	user.surname = req.body.surname;
	user.firstname = req.body.firstname;
	user.role = req.body.role;
	user.save(function(err){
		if(err) {
			console.log(err);
			throw err;
		} else {
			console.log('User saved['+username+']');
			res.message("新規ユーザー"+username+"を登録しました。", "info");
			res.redirect('/');
		}
	});
});

// ユーザ情報更新処理
router.post('/updateUser', function(req, res) {
	var username = req.body.username;
	var surname = req.body.surname;
	var firstname = req.body.firstname;
	var role = req.body.role;
	if(!isValid(req, res, username)){
		res.message("エラーが発生しました。", "error");
		return res.redirect('/');
	}
	console.log('更新ユーザーID['+username+']');
	console.log("update user:"+username+","+surname+","+firstname);
	User.find({username:username}, function(err, user0) {
		if(err){
			console.log(err);
			throw err;
		}
		var modified = user0;
		modified.surname = surname;
		modified.firstname = firstname;
		modified.role = role;
		User.findOneAndUpdate({username:username}, modified, function (err2, place) {
			if(err2){
				console.log(err2);
				throw err2;
			} else {
				res.message("ユーザー情報を更新しました。", "info");
				res.redirect('/');
			}
		});
	});
});

module.exports = router;
