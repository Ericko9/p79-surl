const { createServer } = require('http');
const apiRouter = require('./routes/api');
const webRouter = require('./routes/web');
const express = require('express');
const createError = require('http-errors');
const limitter = require('express-rate-limit');
const path = require('path');
const cors = require('cors');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const globalErrorHandler = require('./middlewares/error.middleware');
const AppError = require('./utils/AppError');

const app = express();

var DEBUG;
if (process.argv[2] == 'dev') {
  DEBUG = true;
} else {
  DEBUG = false;
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('json spaces', 2);

app.use(cors({ origin: '*' }));

if (!DEBUG) {
  app.use(
    limitter({
      windowMs: 1 * 60 * 1000,
      max: 20,
      message: JSON.stringify({
        message: 'to many request',
      }),
    })
  );
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1', apiRouter);
app.use('/', webRouter);

app.use((req, res, next) => {
  next(new AppError(`Page not found: ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

const server = createServer(app);

module.exports = { app, server };
