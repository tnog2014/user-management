var express = require('express');
var crypto = require('crypto');
var router = express.Router();

// passportのソースを参考にして、reqにロール取得関数を追加。
var http = require('http')
, req = http.IncomingMessage.prototype;
req.getRole = function(){
	if(this.user){
		return this.user.roles;
	} else {
		return [];
	}
};

var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/users');
var Schema = mongoose.Schema;
var Users = new Schema({
   username: {type: String, unique: true},
   password: String,
   surname: String,
   firstname: String,
   roles: [String]
   });

mongoose.model('User', Users);

// ロール定義
var roles = [
	{id:"role1", desc:"ロール１"},
	{id:"role2", desc:"ロール２"},
	{id:"admin", desc:"管理者"}
];

var User = mongoose.model('User');



// 認証設定
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

// シリアライズ方法の設定
passport.serializeUser(function(user, done) {
  // console.log("serializeUser");
  // TODO: パスワードをシリアライズしないようにする。
  //console.dir(user);
  done(null, user);
});

// デシリアライズ方法の設定
passport.deserializeUser(function(user, done) {
 // console.log("deserializeUser");
 // console.dir(user);
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
  res.render('login', getNavbarInfo(req, res));
});

// ログイン処理
router.post('/login',  function(req, res, next){
	passport.authenticate('local', function(err, user, info) {
		if (err) {
			return next(err);
		}
		if (!user) {
		    res.message("認証に失敗しました。", "alert-danger");
		    return res.redirect('/auth/login');
		}
		req.logIn(user, function(err) {
			if (err) {
				return next(err);
			} else {
				res.message("ログインしました。", "alert-success");
				return res.redirect('/');
			}
		});
	})(req, res, next);
});



// ログアウト処理
router.get('/logout', function(req, res){
  req.logout();
  res.message("ログアウトしました。", "alert-success");
  res.redirect('/');
});

function isValid(req, res, validUser){
	// 認証されていなければfalseを返す。
	if(!req.isAuthenticated()){
		return false;
	}
	// 管理者ロールの場合には、trueを返す
	// TODO: テーブルに基づくロール・権限。
	var rs = req.getRole();
	// TODO: 一時的にすべてOK
	return true;
	for(var i = 0; i < rs.length; i++) {
		if(rs[i] === "admin") {
			return true;
		}
	}
	// 実行可能ユーザーが指定されている場合には、
	// ログインユーザーと一致する場合にはtrueを返す。それ以外の場合には、falseを返す。
	if(validUser){
		var loginUser = req.user.username;
		console.log("ログインユーザー, 編集対象ユーザー:["+loginUser+"]["+validUser+"]");
		return validUser === loginUser;
	}
	return false;
}

// ユーザー登録画面表示
router.get('/create-user', function(req, res) {
	if(!isValid(req, res)){
		res.message("エラーが発生しました。", "alert-danger");
		return res.redirect('/');
	}
	var map = getNavbarInfo(req, res);
	map.roles = roles;
	res.render('create-user', map);
});

// ユーザー情報画面表示
router.get('/user/:username', function(req, res) {
	var username = req.params.username;
	console.log("username["+username+"]");
	if(!isValid(req, res, username)){
		res.message("エラーが発生しました。", "alert-danger");
		return res.redirect('/');
	}

	console.log(":username="+username);
	User.findOne({ username: username }, function(err, user) {
		if (err) { return done(err); }
		if (!user) {
			return done(null, false, { message: 'ユーザーIDが間違っています。' });
		}

		var map = getNavbarInfo(req, res);
		map.username = username;
		map.surname = user.surname;
		map.firstname = user.firstname;
		var extendedRoles = []
		for(var i=0; i< roles.length;i++){
			var item = {};
			item.id = roles[i].id;
			item.desc = roles[i].desc;
			item.checked = contains(user.roles, roles[i].id);
			extendedRoles.push(item);
		}
		map.roles = extendedRoles;
		res.render('edit-user', map);
	});
});

function contains(array, value){
	for(var i = 0; i < array.length; i++){
		if(array[i] === value){
			return true;
		}
	}
	return false;
}

// ユーザー削除処理
router.get('/delete/:username', function(req, res) {
	if(!isValid(req, res)){
		res.message("エラーが発生しました。", "alert-danger");
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
				res.message("ユーザーを削除しました。", "alert-success");
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
		res.message("エラーが発生しました。", "alert-danger");
		return res.redirect('/');
	}
	User.find({}, function(err, users0) {
		var users = [];
		for (var i = 0; i < users0.length; i++) {
			users.push({
				username: users0[i].username,
				surname: users0[i].surname,
				firstname: users0[i].firstname,
				roles: users0[i].roles
			});
		}
		var map = getNavbarInfo(req, res);
		map.users = users;
		res.render('user-list', map);
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
		res.message("エラーが発生しました。", "alert-danger");
		return res.redirect('/');
	}
	var username = req.body.username;

	// TODO: 正式なデータチェックロジックを実装する。
	console.log("登録：ユーザーID["+username+"]");
	if(!username){
		res.message("ユーザーIDを入力して下さい。", "alert-warning");
		return res.redirect('/auth/create-user');
	}
	var password = req.body.password;
	console.log("create user:"+username+","+password);
	var digest = toHexDigest(password);
	var user = new User();
	user.username = username;
	user.password = digest;
	user.surname = req.body.surname;
	user.firstname = req.body.firstname;
	user.roles = req.body.roles;
	user.save(function(err){
		if(err) {
			console.log(err);
			throw err;
		} else {
			console.log('User saved['+username+']');
			res.message("新規ユーザー"+username+"を登録しました。", "alert-success");
			res.redirect('/');
		}
	});
});

// ユーザ情報更新処理
router.post('/updateUser', function(req, res) {
	var username = req.body.username;
	var surname = req.body.surname;
	var firstname = req.body.firstname;
	var roles = req.body.roles;
	if(!isValid(req, res, username)){
		res.message("エラーが発生しました。", "alert-danger");
		return res.redirect('/');
	}
	console.log('更新ユーザーID['+username+']');
	console.log("update user:"+username+","+surname+","+firstname);
	User.findOne({ username: username }, function(err, modified) {
		if(err){
			console.log(err);
			throw err;
		}
		if(modified === null){
			res.message("ユーザー情報の更新に失敗しました。", "alert-danger");
			return res.redirect('/');
		}
		modified.surname = surname;
		modified.firstname = firstname;
		modified.roles = roles;
		modified.save(function(err2){
			if (err2) {
				console.log(err2);
			} else {
				res.message("ユーザー情報を更新しました。", "alert-success");
				res.redirect('/');
			}
		});
	});
});


function getNavbarInfo(req, res){
	var username = "";
	var fullname = "";
	if(req.user){
		username = req.user.username;
		fullname = "（"+req.user.surname+ " "+req.user.firstname+"）";
	}

	var roles = req.getRole();
	var authen = {};
	for(var i = 0; i < roles.length;i++){
		if(roles[i] === "admin"){
			authen["user-manage"] = true;
		}
	}
	var ret = {
		title: 'Express',
		header: {
			username: username,
			fullname: fullname,
			authStatus: req.isAuthenticated(),
			roles: req.getRole(),
			authen: authen
		}
	};
	console.log("====================");
	console.dir(ret);
	console.log("====================");
	return ret;
}

module.exports = router;
