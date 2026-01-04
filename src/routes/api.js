var express = require('express');
var fs = require('fs');
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
router.post(
  '/links/:id/generate-qr',
  auth,
  linkOwnership,
  linkController.generateQr
);
router.get(
  '/links/:id/qr-detail',
  auth,
  linkOwnership,
  linkController.getQrDetail
);

// ANALYTIC MANAGEMENT
const analyticsController = require('../controllers/analytic.controller');

router.get(
  '/analytics/:link_id/summary',
  auth,
  linkOwnership,
  analyticsController.getSummary
);
router.get(
  '/analytics/:link_id/location',
  auth,
  linkOwnership,
  analyticsController.getLocation
);
router.get(
  '/analytics/:link_id/time-series',
  auth,
  linkOwnership,
  analyticsController.getTimeSeries
);

// MAILER MANAGEMENT
const mailerController = require('../controllers/mailer.controller');

router.post('/auth/forgot-password', mailerController.forgotPassword);

module.exports = router;
