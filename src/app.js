if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { server } = require('./server');

const PORT = process.env.PORT || 8000;
server.listen(PORT, function () {
  if (server.listening) {
    console.log(`Server is listening on port ${PORT}`);
  }
});
