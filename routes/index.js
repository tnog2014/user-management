var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
	console.log("認証状態:"+req.isAuthenticated());
	console.log("ロール:"+req.getRole());
	res.render('index', { title: 'Express' , authStatus: req.isAuthenticated(), role: req.getRole()});
});

module.exports = router;
