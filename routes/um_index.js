var express = require('express');
var router = express.Router();
var um_utils = require('../lib/um_utils');

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index', um_utils.getNavbarInfo(req, res));
});

module.exports = router;
