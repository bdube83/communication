const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const { handleSocketConnection } = require('./services/socketHandlerService');


dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB)
  .then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3200;

const expressServer = app.listen(port, () => {
  console.log(`listening on port ${port}`)
})

const io = new Server(expressServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
  }
})

io.on('connection', socket => {
  handleSocketConnection(socket, io);
})

app.set('socketio', io);

