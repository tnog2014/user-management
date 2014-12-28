var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
console.log("req.user");
console.dir(req.user);
  console.log("認証状態:"+req.isAuthenticated());
  var message = "jjjjjjjj";
  res.render('index', { title: 'Express' , authStatus: req.isAuthenticated(), message: message});
});

module.exports = router;
