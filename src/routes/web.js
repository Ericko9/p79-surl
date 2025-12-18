var express = require('express')
var fs = require('fs')
var router = express.Router()
var path = require('path')

var { cwd }  = process

function getDbPath() {
    if (process.env.VERCEL) return path.join('/tmp', 'database.json')
    return path.join(cwd(), 'src', 'database', 'database.json')
}

var pathDB = getDbPath()
var db
try {
    db = fs.readFileSync(pathDB, 'utf-8') || '[]'
} catch (e) {
    try { fs.writeFileSync(pathDB, '[]') } catch (e) {}
    db = '[]'
}
db = JSON.parse(db)

router.get('/', function(req, res, next) {
    res.render('index', { data: db, host: req.get('host')  })
})

router.get('/shortens', function(req, res, next) {
    res.render('shortens')
})

router.get('/about', function(req, res, next) {
    res.render('about')
})

router.get('/community', function(req, res, next) {
    res.render('community')
})

router.get('/contributors', function(req, res, next) {
    res.render('contributors')
})

router.get('/favicon.ico', function(req, res) {
    res.status(204).end()
})

router.get('/:key', async function(req, res, next) {
    var { key } = req.params

    pathDB = getDbPath()
    try {
        db = fs.readFileSync(pathDB, 'utf-8') || '[]'
    } catch (e) {
        try { fs.writeFileSync(pathDB, '[]') } catch (e) {}
        db = '[]'
    }
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
            try { fs.writeFileSync(pathDB, JSON.stringify(db)) } catch (e) {}
            resolve()
        }
    })
}

module.exports = router
