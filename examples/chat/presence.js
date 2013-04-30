/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

var cio = require('socket.io-client');
var uuid = require('node-uuid');
var Nicknames = require('nicknames');

var localSocketsRoomName = 'local' + uuid.v4();
var nicknames = new Nicknames(localSocketsRoomName);

var log;
var presence;

exports.initialize = function (io, port) {
  log = io.get('logger');

  initPresenceServer(io, port);
  initPresenceClient(io, port);
  initClientHandling(io, port);
});

function initPresenceServer(io, port) {
  var server = io.of('/presence');
  server.on('connection', function (socket) {
    socket.broadcast.emit('send nicknames');

    socket.on('nicknames', function (sourceNode, nicks) {
      socket.broadcast.emit('nicknames', sourceNode, nicks);
    });
  });
}

function initPresenceClient(io, port) {
  presence = cio.connect('http://localhost:' + port + '/presence');
  presence.on('connect', function () {
    log.info('Connected to presence client');
  });

  presence.on('send nicknames', function () {
    presence.emit('nicknames', localSocketsRoomName, nicknames.getLocalNames());
  });

  presence.on('nicknames', function (sourceNode, nicks) {
    nicknames.setRemoteNames(sourceNode, nicks);
    sendNicknamesToChatClients();
  });
}

function updatePresence() {
  presence.emit('nicknames', localSocketsRoomName, nicknames[localSocketsRoomName]);
}

function initClientHandling(io, port) {
  io.sockets.on('connection', function (socket) {
    socket.join(localSocketsRoomName);

    socket.on('nickname', function (nick, fn) {
      if (nicknames[nick]) {
        fn(true);
      } else {
        fn(false);
        nicknames[nick] = socket.nickname = nick;
        socket.broadcast.emit('announcement', nick + ' connected');
        servers.emit('nicknames', myNicknames());
      }
    });

    socket.on('disconnect', function () {
      if (!socket.nickname) return;
      var key = localSocketsRoomName + ':' + socket.nickname;
      delete nicknames[key];
      socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
      servers.emit('nicknames', nicknames);
    }); 

  }
}

  io.sockets.on('connection', function (socket) {
    socket.join(localSocketsRoomName);

    socket.on('nickname', function (nick, fn) {
      var key = localSocketsRoomName + ':' + nick;
      if (nicknames[key]) {
        fn(true);
      } else {
        fn(false);
        nicknames[key] = socket.nickname = nick;
        socket.broadcast.emit('announcement', nick + ' connected');
        servers.emit('nicknames', myNicknames());
      }
    });

    socket.on('disconnect', function () {
      if (!socket.nickname) return;
      var key = localSocketsRoomName + ':' + socket.nickname;
      delete nicknames[key];
      socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
      servers.emit('nicknames', nicknames);
    }); 
  });

  setInterval(function () {
    console.log('sending announcement');
    io.sockets.in(localSocketsRoomName).emit('announcement', 'local announcement for port ' + port);
  }, 10000);

  io.of('/servers')
    .on('connection', function (socket) {

    });
}
