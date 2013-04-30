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

var uuid = require('node-uuid');

var nicknames = {};
var localSocketsRoomName = 'local' + uuid.v4();

exports.initialize = function (io, port) {
  io.sockets.on('connection', function (socket) {
    socket.join(localSocketsRoomName);

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

  setInterval(function () {
    console.log('sending announcement');
    io.sockets.in(localSocketsRoomName).emit('announcement', 'local announcement for port ' + port);
  }, 10000);
}
