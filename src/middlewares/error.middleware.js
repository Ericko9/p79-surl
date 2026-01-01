const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // cek jenis error dari status code
  if (statusCode === 500) console.error('INTERNAL_ERROR:', err);
  else
    console.log(
      `[${req.method}] ${req.originalUrl} - ${statusCode}: ${message}`
    );

  return res.status(statusCode).json({
    status: false,
    message: message,
  });
};

module.exports = globalErrorHandler;
