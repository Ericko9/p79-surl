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

router.get('/reset-password', function(req, res, next) {
    res.render('resetpassword')
})

router.get('/login', function(req, res, next) {
    res.render('login')
})

router.get('/register', function(req, res, next) {
    res.render('register')
})

const linkController = require('../controllers/link.controller');

router.get('/:shortKey', linkController.redirect);

router.post('/register', async (req, res) => {
    try {
      const { username, email, password } = req.body
  
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Semua field wajib diisi'
        })
      }
  
      const user = await register(username, email, password)
  
      res.status(201).json({
        success: true,
        message: 'Register berhasil',
        data: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      })
  
    } catch (err) {
      if (err.message === 'USER_EXISTS') {
        return res.status(409).json({
          success: false,
          message: 'Username atau email sudah digunakan'
        })
      }
  
      console.error(err)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  })

router.get('/index', function(req, res, next) {
    res.render('registerflow')
})


router.get('/:key', async function(req, res, next) {
    var { key } = req.params

    pathDB = (cwd() + '/src/database/database.json')
    db = fs.readFileSync(pathDB, 'utf-8') || '[]'
    db = JSON.parse(db)

    var data = db.find(v => v.key == key)

    if (data) {
        var { key, redirect_uri } = data
        var uri = redirect_uri
        updateCountUri({ key })
        res.redirect(301, uri)
    } else {
        res.redirect(301, '/')
    }
})

function updateCountUri({ key } = {}) {
    var data = db.find(v => v.key == key)
    return new Promise(resolve => {
        var index = db.findIndex(v => v.key == key)
        if (data) {
            db[index].count += 1
            fs.writeFileSync(pathDB, JSON.stringify(db))
            resolve()
        }
    })
}
router.get('/favicon.ico', function (req, res) {
  res.status(204).end();
});



module.exports = router;
