var express = require('express');
var fs = require('fs');
var router = express.Router();
var path = require('path');

var { cwd } = process;

function getDbPath() {
  if (process.env.VERCEL) return path.join('/tmp', 'database.json');
  return path.join(cwd(), 'src', 'database', 'database.json');
}

var pathDB = getDbPath();
var db;
try {
  db = fs.readFileSync(pathDB, 'utf-8') || '[]';
} catch (e) {
  try {
    fs.writeFileSync(pathDB, '[]');
  } catch (e) {}
  db = '[]';
}
db = JSON.parse(db);

router.get('/', function (req, res, next) {
  res.render('index', { data: db, host: req.get('host') });
});

router.get('/shortens', function (req, res, next) {
  res.render('shortens');
});

router.get('/about', function (req, res, next) {
  res.render('about');
});

router.get('/community', function (req, res, next) {
  res.render('community');
});

router.get('/contributors', function (req, res, next) {
  res.render('contributors');
});

router.get('/favicon.ico', function (req, res) {
  res.status(204).end();
});

const linkController = require('../controllers/link.controller');

router.get('/:shortKey', linkController.redirect);

module.exports = router;
