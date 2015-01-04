var express = require('express');
var router = express.Router();
var um_utils = require('../lib/um_utils');
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/um');
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



function createDefaultAdminUser() {
	User.find({}, function(err, users) {
		if(users.length == 0){
			console.log("デフォルト管理ユーザーを作成します。");
			var user = new User();
			user.username = "admin";
			user.password = um_utils.toHexDigest('nodeapp123');
			user.surname = "Admin";
			user.firstname = "Admin";
			user.roles = [ "admin" ];
			user.save(function(err){
				if(err) {
					console.log("デフォルト管理ユーザーの作成に失敗しました。");
					console.log(err);
					throw err;
				}
				console.log("デフォルト管理ユーザーの作成に成功しました。");
			});
		}
	});
}

//デフォルト管理ユーザー作成
createDefaultAdminUser();

// 認証設定
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

// シリアライズ方法の設定
passport.serializeUser(function(user, done) {
  user.password = null; // パスワードをシリアライズしない。
  done(null, user);
});

// デシリアライズ方法の設定
passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new LocalStrategy(
	function(username, password, done) {
		User.findOne({ username: username }, function(err, user) {
			if (err) { return done(err); }
			if (!user) {
				return done(null, false, { message: 'ユーザーIDが間違っています。' });
			}
			var digest = um_utils.toHexDigest(password);
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
	map.username = "";
	map.password = "";
	map.password_confirm = "";
	map.surname = "";
	map.firstname = "";

	// 設定可能なロールの配列データを追加。
	var definedRoles = um_utils.getDefinedRoleArray();
	map.roles = definedRoles;
	res.render('um_create_user', map);
});

// ユーザー情報画面表示
router.get('/user/:username', function(req, res) {
	var username = req.params.username;
	console.log("ユーザー情報画面表示[" + username + "]");
	if(um_utils.isNotAuthorized(req, "update-user")
			&& username !== um_utils.getLoginUser(req)){
		res.message("ユーザー情報表示の権限がありません。", "alert-danger");
		return res.redirect('/');
	}

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

		var definedRoles = um_utils.getDefinedRoleArray();
		map.roles = getExtendedRoles(req, definedRoles, user.roles);
		res.render('um_update_user', map);
	});
});

function getExtendedRoles(req, definedRoles, userRoles){
	var extendedRoles = [];
	var userRoles = userRoles || [];
	for(var i=0; i< definedRoles.length;i++){
		var item = {};
		var checked = contains(userRoles, definedRoles[i].id);
		item.id = definedRoles[i].id;
		item.desc = definedRoles[i].desc;
		item.checked = checked;
		if(checked || um_utils.isAuthorized(req, "update-user")){
			extendedRoles.push(item);
		}
	}
	return extendedRoles;
}

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
		console.log("ユーザー削除処理[" + username + "]");
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

	// usernameに関して、昇順でソートする。
	User.find({}, null, {sort: {username: 1}}, function(err, users0) {
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

// ユーザ登録処理
router.post('/user', function(req, res) {
	console.log("ユーザー登録処理");
	if(um_utils.isNotAuthorized(req, "create-user")){
		res.message("ユーザー登録の権限がありません。", "alert-danger");
		return res.redirect('/');
	}

	// データチェック
	var errorCheck = dataCheck(req.body);

	if(errorCheck["error"]){
		res.message(errorCheck["message"], "alert-warning");

		var map = um_utils.getNavbarInfo(req, res);
		map.username = req.body.username;
		map.password = "";
		map.password_confirm = "";
		map.surname = req.body.surname;
		map.firstname = req.body.firstname;

		// 設定可能なロールの配列データを追加。
		var definedRoles = um_utils.getDefinedRoleArray();
		map.roles = getExtendedRoles(req, definedRoles, req.body.roles);
		return res.render('um_create_user', map);
	}
	var username = req.body.username;
	var password = req.body.password;
	var digest = um_utils.toHexDigest(password);
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
			console.log("新規ユーザー"+username+"を登録しました。");
			res.message("新規ユーザー"+username+"を登録しました。", "alert-success");
			res.redirect('/');
		}
	});
});

function dataCheck(obj){
	var items = [];
	if (!obj.username) {
		items.push("ユーザーID");
	}
	if (!obj.password) {
		items.push("パスワード");
	}
	if (!obj.password_confirm) {
		items.push("パスワード（確認）");
	}
	var message = "";
	for (var i = 0; i < items.length; i++) {
		message += items[i];
		if (i < items.length - 1){
			message += ", ";
		}
	}
	if(message !== "") {
		message += "が未入力です。";
		return {error: true, message: message};
	}
	if(obj.password !== obj.password_confirm){
		return {error: true, message: "パスワードとパスワード（確認）が一致しません。"};
	}
	return {error: false};
}

function dataCheckUpdate(obj){
	if((obj.password !== "" || obj.password_confirm !== "")
			&& obj.password !== obj.password_confirm){
		return {error: true, message: "パスワードとパスワード（確認）が一致しません。"};
	}
	return {error: false};
}

// ユーザ情報更新処理
router.post('/updateUser', function(req, res) {
	console.log("ユーザー情報更新処理[" + req.body.username + "]");
	var username = req.body.username;
	var password = req.body.password;
	var surname = req.body.surname;
	var firstname = req.body.firstname;
	var roles = req.body.roles;
	// ユーザー更新権限がなく、かつ、変更対象ユーザーが自分自身でない場合には、エラーとする。
	if(um_utils.isNotAuthorized(req, "update-user")
			&& username !== um_utils.getLoginUser(req)){
		res.message("ユーザー情報更新の権限がありません。", "alert-danger");
		return res.redirect('/');
	}

	var errorCheck = dataCheckUpdate(req.body);
	if(errorCheck["error"]){
		res.message(errorCheck["message"], "alert-warning");
		var map = um_utils.getNavbarInfo(req, res);
		map.username = req.body.username;
		map.password = "";
		map.password_confirm = "";
		map.surname = req.body.surname;
		map.firstname = req.body.firstname;

		// 設定可能なロールの配列データを追加。
		var definedRoles = um_utils.getDefinedRoleArray();
		map.roles = getExtendedRoles(req, definedRoles, req.body.roles);
		return res.render('um_update_user', map);
	}

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

		// パスワードが入力されている場合には更新対象とする。
		if(password !== ""){
			var digest = um_utils.toHexDigest(password);
			modified.password = digest;
		}
		// "update-user"権限がある場合のみロールを更新する。
		if(um_utils.isAuthorized(req, "update-user")){
			modified.roles = roles;
		}

		// TODO: パスワードが空の場合には、更新しない。

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
