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
var util = require('util');
var Nicknames = require('./nicknames');

var localSocketsRoomName = 'local' + uuid.v4();
var nicknames = new Nicknames(localSocketsRoomName);

var log;
var presence;

exports.initialize = function (io, port) {
  log = io.get('logger');

  initPresenceServer(io, port);
  initPresenceClient(io, port);
  initClientHandling(io, port);
};

function initPresenceServer(io, port) {
  var server = io.of('/presence');
  server.on('connection', function (socket) {
    socket.broadcast.emit('send-nicknames');

    socket.on('nicknames', function (sourceNode, nicks) {
      log && log.info('nicknames received, broadcasting');
      socket.broadcast.emit('nicknames', sourceNode, nicks);
    });
  });
}

function initPresenceClient(io, port) {
  var presenceUrl = process.env.PRESENCE_URL;
  
  if (!presenceUrl) {
    presenceUrl = 'http://localhost:' + port;
  }

  presenceUrl += '/presence';
  
  log && log.info('Connecting to presence client', 'url:' + presenceUrl);

  presence = cio.connect(presenceUrl);  presence.on('connect', function () {
    log && log.info('Connected to presence client');
  });

  presence.on('send-nicknames', function () {
    log && log.info('sending local nicknames', 'nicks:' + nicknames.getLocalNames());
    presence.emit('nicknames', localSocketsRoomName, nicknames.getLocalNames());
  });

  presence.on('nicknames', function (sourceNode, nicks) {
    log && log.info('received nicknames', 'node:' + sourceNode, 'nicks:' + util.inspect(nicks));
    nicknames.setRemoteNames(sourceNode, nicks);
    io.sockets.in(localSocketsRoomName).emit('nicknames', nicknames.getAllNames());
  });
}

function updatePresence(io) {
  io.sockets.in(localSocketsRoomName).emit('nicknames', nicknames.getAllNames());
  presence.emit('nicknames', localSocketsRoomName, nicknames.getLocalNames());
}

function initClientHandling(io, port) {
  io.sockets.on('connection', function (socket) {
    socket.join(localSocketsRoomName);

    socket.on('nickname', function (nick, fn) {
      if (nicknames.hasLocalName(nick)) {
        fn(true);
      } else {
        fn(false);
        nicknames.addLocalName(nick);
        socket.nickname = nick;
        socket.broadcast.emit('announcement', nick + ' connected');
        updatePresence(io);
      }
    });

    socket.on('disconnect', function () {
      if (!socket.nickname) return;
      log && log.info('client disconnected', 'nick:' + socket.nickname);
      nicknames.delLocalName(socket.nickname);
      socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
      updatePresence(io);
    }); 
  });
}
