var express = require('express');
var crypto = require('crypto');
var router = express.Router();
var um_utils = require('../lib/um_utils');
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

var User = mongoose.model('User');

// 認証設定
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

// シリアライズ方法の設定
passport.serializeUser(function(user, done) {
  // console.log("serializeUser");
  // TODO: パスワードをシリアライズしないようにする。
  // console.dir(user);
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
  res.render('um_login', um_utils.getNavbarInfo(req, res));
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

// ユーザー登録画面表示
router.get('/create-user', function(req, res) {
	if(um_utils.isNotAuthorized(req, "create-user")){
		res.message("ユーザー登録の権限がありません。", "alert-danger");
		return res.redirect('/');
	}
	var map = um_utils.getNavbarInfo(req, res);

	// 設定可能なロールの配列データを追加。
	map.roles = um_utils.getDefinedRoleArray();
	res.render('um_create_user', map);
});

// ユーザー情報画面表示
router.get('/user/:username', function(req, res) {
	var username = req.params.username;
	console.log("username["+username+"]");
	if(um_utils.isNotAuthorized(req, "update-user")
			&& username !== um_utils.getLoginUser(req)){
		res.message("ユーザー情報表示の権限がありません。", "alert-danger");
		return res.redirect('/');
	}

	console.log(":username="+username);
	User.findOne({ username: username }, function(err, user) {
		if (err) { return done(err); }
		if (!user) {
			return done(null, false, { message: 'ユーザーIDが間違っています。' });
		}

		var map = um_utils.getNavbarInfo(req, res);
		map.username = username;
		map.surname = user.surname;
		map.firstname = user.firstname;

		// ユーザーがもつロールか否かという情報を追加したロール配列を作成。
		// "update-user"権限を持たない場合には、自分が保持するロール以外は表示しない。
		var extendedRoles = []
		var roles = um_utils.getDefinedRoleArray();
		for(var i=0; i< roles.length;i++){
			var item = {};
			var checked = contains(user.roles, roles[i].id);
			item.id = roles[i].id;
			item.desc = roles[i].desc;
			item.checked = checked;
			if(checked || um_utils.isAuthorized(req, "update-user")){
				extendedRoles.push(item);
			}
		}
		map.roles = extendedRoles;
		res.render('um_update_user', map);
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
	if(um_utils.isNotAuthorized(req, "delete-user")){
		res.message("ユーザー削除の権限がありません。", "alert-danger");
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
				res.message("ユーザー " + username + " を削除しました。", "alert-success");
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
	if(um_utils.isNotAuthorized(req, "list-user")){
		res.message("ユーザー一覧表示の権限がありません。", "alert-danger");
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
		var map = um_utils.getNavbarInfo(req, res);
		map.users = users;
		res.render('um_user_list', map);
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
	if(um_utils.isNotAuthorized(req, "create-user")){
		res.message("ユーザー登録の権限がありません。", "alert-danger");
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
	// ユーザー更新権限がなく、かつ、変更対象ユーザーが自分自身でない場合には、エラーとする。
	if(um_utils.isNotAuthorized(req, "update-user")
			&& username !== um_utils.getLoginUser(req)){
		res.message("ユーザー情報更新の権限がありません。", "alert-danger");
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
		// "update-user"権限がある場合のみロールを更新する。
		if(um_utils.isAuthorized(req, "update-user")){
			modified.roles = roles;
		}
		modified.save(function(err2){
			if (err2) {
				console.log(err2);
			} else {
				res.message(username + "のユーザー情報を更新しました。", "alert-success");
				res.redirect('/');
			}
		});
	});
});

module.exports = router;
