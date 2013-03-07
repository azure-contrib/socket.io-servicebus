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

'use strict';

(function () {
  var startTime;
  var socket;
  var messagesToSend;
  var settings;

  function collectSettings() {
    var settings = {};

    settings.runName = $('#runName').val();
    settings.messageSize = +($('#messageSize').val());
    settings.messagesPerBlock = +($('#messagesPerBlock').val());
    settings.sendIntervalMS = +($('#sendInterval').val());
    settings.totalRunTimeMS = +($('#totalTestTime').val()) * 1000;

    return settings;
  }

  function generateMessagesToSend(settings) {
    var messages = [];
    var message = '';
    var contentChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcedfghijklmnopqrstuvwxyz0123456789'.split('');

    for(var i = 0; i < settings.messageSize; ++i) {
      message += contentChars[0];
      contentChars.push(contentChars.shift());      
    }

    for(i = 0; i < settings.messagesPerBlock; ++i) {
      messages.push(message);
    } 
    return messages;
  }

  function sendMessages() {
    messagesToSend.forEach(function (m) {
      socket.emit('test', Date.now(), m);
    });
  }

  function startSending() {
    disableForm();
    startTime = Date.now();
    socket.emit('start', settings);
    function sendBlock() {
      var now = Date.now();
      if (Math.floor(now - startTime) < settings.totalRunTimeMS) {
        sendMessages();
        setTimeout(sendBlock, settings.sendIntervalMS);
      } else {
        socket.emit('stop');
        enableForm();
      }
    }
    sendBlock();
  }

  function connect() {
    if (!socket) {
      socket = io.connect();
      socket.on('connect', function () {
        startSending();
      });
    } else {
      startSending();
    }
  }

  function disableForm() {
    $('input').attr('disabled', 'disabled');
    $('#startTest').attr('disabled', 'disabled');
  }

  function enableForm() {
    $(':disabled').removeAttr('disabled');
  }

  $(function () {
    $('#startTest').click(function () {
      disableForm();
      settings = collectSettings();
      messagesToSend = generateMessagesToSend(settings);
      connect();
    });
  });
})();
