/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , stylus = require('stylus')
  , nib = require('nib')
  , sio = require('socket.io')
  , SbStore = require('socket.io-servicebus');

/**
 * App.
 */

var app = express();

// Pick up port, topic, & subscription names from command line / environment

var topic = process.argv[2] || process.env['SB_CHAT_TOPIC'] || 'sbchat'; 
var subscription = process.argv[3] || process.env['SB_CHAT_SUBSCRIPTION'] || 'client1';
var port = process.argv[4] || process.env['PORT'] || 3000;
var sbconn = process.argv[5] || process.env['SB_CONN'] //connection string from portal

/**
 * App configuration.
 */

app.configure(function () {
  app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
  app.use(express.static(__dirname + '/public'));
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  function compile (str, path) {
    return stylus(str)
      .set('filename', path)
      .use(nib());
  };
});

/**
 * App routes.
 */

app.get('/', function (req, res) {
  res.render('index', { layout: false });
});

/**
 * App listen.
 */

var server = http.createServer(app);

server.listen(port, function () {
  var addr = server.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

/**
 * Socket.IO server (single process only)
 */

var io = sio.listen(server)
  , nicknames = {};

/**
 * Set up socket.io to use service bus store
 */

io.configure(function () {
  io.set('store', new SbStore({
    topic: topic,
    subscription: subscription,
    connectionString: sbconn
  }));

  io.set('transports', ['xhr-polling']);
});

io.sockets.on('connection', function (socket) {
  socket.on('user message', function (msg) {
    socket.broadcast.emit('user message', socket.nickname, msg);
  });

  socket.on('nickname', function (nick, fn) {
    if (nicknames[nick]) {
      fn(true);
    } else {
      fn(false);
      nicknames[nick] = socket.nickname = nick;
      socket.broadcast.emit('announcement', nick + ' connected');
      io.sockets.emit('nicknames', nicknames);
    }
  });

  socket.on('disconnect', function () {
    if (!socket.nickname) return;

    delete nicknames[socket.nickname];
    socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
    socket.broadcast.emit('nicknames', nicknames);
  });
});
