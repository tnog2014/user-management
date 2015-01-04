var crypto = require('crypto');

function um_utils(){

	this.getLoginUser = function getLoginUser(req) {
		var ret;
		if (req.user) {
			ret = req.user.username;
		}
		return ret;
	}

	this.getRoles = function getRoles(req){
		if(req.user){
			return req.user.roles;
		} else {
			return [];
		}
	};

	// ロール定義
	var definedRoles = [
		{id:"role1", desc:"ロール１"},
		{id:"role2", desc:"ロール２"},
		{id:"admin", desc:"管理者", actions:["create-user", "delete-user", "update-user", "list-user"]}
	];

	var definedRoleMap;

	this.getDefinedRoleArray = function getDefinedRoleArray() {
		// TODO: コピーを返却するほうがよい。
		return definedRoles;
	}

	this.getDefinedRoleMap = function getDefinedRoleMap() {
		var map = {};
		if(!definedRoleMap){
			for(var i = 0; i < definedRoles.length; i++) {
				var role = definedRoles[i];
				map[role.id] = definedRoles[i];
			}
			definedRoleMap = map;
		}
		return definedRoleMap;
	}

	this.isAuthorized = function isAuthorized(req, key, options){
		var authen = this.getAuthenData(req, options);
		var ret = authen[key];
		console.log("権限チェック isAuthorized[" + key + "," + options + "] => "+ret);
		return ret
	}

	this.isNotAuthorized = function isNotAuthorized(req, key, options){
		var authen = this.getAuthenData(req, options);
		var ret = !authen[key];
		console.log("権限チェック isNotAuthorized[" + key + "," + options + "] => "+ret);
		return ret;
	}

	this.getAuthenData = function getAuthenData(req, options){
		// ログインユーザーID
		var username = this.getLoginUser(req);

		// ユーザーのロール
		var roles = this.getRoles(req);

		// 返却する権限情報オブジェクト
		var authen = {};

		// ログイン状態を設定（passportで定義されている関数を利用）
		if(req.isAuthenticated()){
			authen["logged-in"] = true;
		}

		// ロールアクション定義情報から、ユーザーのロールに応じたアクション権限を追加する。
		var definedRoleMap = this.getDefinedRoleMap();
		for(var i = 0; i < roles.length;i++){
			var r = definedRoleMap[roles[i]];
			var actions = r.actions;
			if(actions){
				for(var q = 0; q < actions.length; q++){
					authen[actions[q]] = true;
				}
			}
		}
		// console.dir(authen);
		return authen;
	}

	this.getNavbarInfo = function getNavbarInfo(req, res){
		var username = "";
		var fullname = "";
		if(req.user){
			username = req.user.username;
			fullname = "（"+req.user.surname+ " "+req.user.firstname+"）";
		}
		var ret = {
			title: 'Express',
			header: {
				username: username,
				fullname: fullname,
				roles: this.getRoles(req),
				authen: this.getAuthenData(req)
			}
		};
		// console.log("====================");
		// console.dir(ret);
		// console.log("====================");
		return ret;
	}

	// パスワードのハッシュを計算する。
	this.toHexDigest = function toHexDigest(password) {
		var sha256sum = crypto.createHash('sha256');
		sha256sum.update(password);
		var digest = sha256sum.digest('hex');
		return digest;
	}

}

module.exports = new um_utils();


