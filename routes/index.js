var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
console.log("req.user");
console.dir(req.user);
console.dir(req.session);
  console.log("認証状態:"+req.isAuthenticated());
  var role = "";
  if(req.user){
  	role = req.user.role;
  };
  res.render('index', { title: 'Express' , authStatus: req.isAuthenticated(), role: role});
});

module.exports = router;
