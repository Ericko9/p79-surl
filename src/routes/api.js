var express = require('express');
var fs = require('fs');
var crypto = require('crypto');
var router = express.Router();
var path = require('path');
const auth = require('../middlewares/auth.middleware');
const optionalAuth = require('../middlewares/optional-auth.middleware');
const linkOwnership = require('../middlewares/ownership-link.middleware');

var { cwd } = process;

function getDbPath() {
  if (process.env.VERCEL) return path.join('/tmp', 'database.json');
  return path.join(cwd(), 'src', 'database', 'database.json');
}

var pathDB = getDbPath();
var pathContributors = path.join(__dirname, 'database', 'contributors.json');

var db;
try {
  db = fs.readFileSync(pathDB, 'utf-8') || '[]';
} catch (e) {
  try {
    fs.writeFileSync(pathDB, '[]');
  } catch (e) {}
  db = '[]';
}
var contributors;
try {
  contributors = fs.readFileSync(pathContributors, 'utf-8') || '[]';
} catch (e) {
  contributors = '[]';
}
db = JSON.parse(db);
contributors = JSON.parse(contributors);

router.get('/', function (req, res, next) {
  res.status(200).json({
    message: 'Hello world!',
  });
});

router.get('/contributors', function (req, res, next) {
  res.status(200).json({
    contributors,
  });
});

router.post('/url', function (req, res, next) {
  var { url, custom_key } = req.body;
  var key = crypto.randomBytes(4).toString('hex');
  if (custom_key) key = custom_key;
  if (/\d/g.test(key[0])) key = randomAlphabet() + key;
  if (!custom_key) custom_key = null;
  if (!url) {
    res.status(400).json({
      status: false,
      message: 'url is required',
    });
  }
  if (url)
    url = !(url.startsWith('http://') || url.startsWith('https://'))
      ? 'http://' + url
      : url;

  var regex = /^[\d]|\W/g;
  var validate_url = validateUrl({ url: url });
  var validateKey = regex.test(key);

  if (validate_url) {
    var redirect_uri = url;
    var result = {
      key,
      redirect_uri,
    };

    var collectKey = db.map(({ key }) => key);
    if (collectKey.includes(key)) {
      res.status(400).json({
        status: false,
        message: 'key already exists',
      });
    } else if (validateKey) {
      res.status(400).json({
        status: false,
        message: `missing key`,
      });
    } else {
      saveToDB(result).then(({ data }) => {
        res.status(200).json({
          status: true,
          data,
        });
      });
    }
  } else {
    res.status(400).json({
      status: false,
      message: 'missing url',
    });
  }
});

function saveToDB({ key, redirect_uri } = {}) {
  var data = { key, redirect_uri, count: 0 };
  db.push(data);
  try {
    fs.writeFileSync(pathDB, JSON.stringify(db));
  } catch (e) {}
  return new Promise((resolve) => {
    resolve({
      data,
    });
  });
}

function validateUrl({ url } = {}) {
  var regex =
    /((?:(?:http?|ftp)[s]*:\/\/)?[a-z0-9-%\/\&=?\.]+\.[a-z]{2,4}\/?([^\s<>\#%"\,\{\}\\|\\\^\[\]`]+)?)/i;
  return regex.test(url);
}

function randomAlphabet() {
  var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  var random = alphabet[Math.floor(Math.random() * alphabet.length)];
  return random;
}

// AUTHENTICATION & AUTHORIZATION
const authController = require('../controllers/auth.controller');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);

// USER MANAGEMENT
const userController = require('../controllers/user.controller');

router.get('/users/profile', auth, userController.getProfile);
router.put('/users/update-user', auth, userController.updateProfile);
router.put('/users/change-password', auth, userController.changePassword);
router.delete('/users/delete-user', auth, userController.deleteUser);
router.post('/users/reset-password', userController.resetPassword);

// LINK MANAGEMENT
const linkController = require('../controllers/link.controller');

router.post('/links/create', optionalAuth, linkController.createLink);
router.get('/links/my-links', auth, linkController.getMyLinks);
router.get(
  '/links/:id/detail',
  auth,
  linkOwnership,
  linkController.getLinkDetail
);
router.put('/links/:id/update', auth, linkOwnership, linkController.updateLink);
router.delete(
  '/links/:id/delete',
  auth,
  linkOwnership,
  linkController.deleteLink
);
router.get('/:shortKey', linkController.redirect);

// MAILER MANAGEMENT
const mailerController = require('../controllers/mailer.controller');

router.post('/auth/forgot-password', mailerController.forgotPassword);

module.exports = router;
