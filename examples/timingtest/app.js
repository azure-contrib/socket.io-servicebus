
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , sio = require('socket.io');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/sender', routes.sender);
app.get('/receiver', routes.receiver);

var server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var io = sio.listen(server);
io.configure(function () {
  io.set('log level', 0);
});

io.sockets.on('connection', function (socket) {
  socket.on('start', function (settings) {
    // TODO: Add server settings here
    socket.broadcast.emit('start', settings);
  });

  socket.on('test', function (timeSent, body) {
    socket.broadcast.emit('test', timeSent, Date.now(), body);
  });

  socket.on('stop', function () {
    socket.broadcast.emit('stop');
  });
});
