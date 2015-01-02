var express = require('express');
var router = express.Router();

function getNavbarInfo(req, res){
	var username = "";
	var fullname = "";
	if(req.user){
		username = req.user.username;
		fullname = "（"+req.user.surname+ " "+req.user.firstname+"）";
	}
	var ret = {
		title: 'Express',
		header:{
			username: username,
			fullname: fullname,
			authStatus: req.isAuthenticated(),
			role: req.getRole()
		}
	};
	return ret;
}

/* GET home page. */
router.get('/', function(req, res) {
	console.log("認証状態:"+req.isAuthenticated());
	console.log("ロール:"+req.getRole());
	res.render('index', getNavbarInfo(req, res));
});

module.exports = router;
