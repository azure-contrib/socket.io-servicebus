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

  var runStats;
  var socket;

  function startRun(settings) {
    show('#running');

    Object.keys(settings).forEach(function (key) {
      $('.' + key).text(settings[key]);
    });

    runStats = {
      startTime: Date.now(),
      messages: []
    }
  }

  function handleTestMessage(timeSent, serverTimeReceived, body) {
    runStats.messages.push([timeSent, Date.now(), serverTimeReceived]);
  }

  function endRun() {
    var stats = calculateStats();
    displayStats(stats);
    show('#summary');
  }

  function connect() {
    socket = io.connect();
    socket.on('start', startRun);
    socket.on('test', handleTestMessage);
    socket.on('stop', endRun);
  }

  $(function () {
    show('#waiting');
    connect();
  });

  function show(divId) {
    ['#waiting', '#running', '#summary'].forEach(function (d) {
      if (d !== divId) {
        $(d).hide();
      } else {
       $(divId).show();
      }
    });
  }

  function calculateStats() {
    var stopTimeMS = Date.now();
    var elapsed = stopTimeMS - runStats.startTime;
    var M = 50;

    var averageReceiveOverhead = (_(runStats.messages.slice(M))
      .map(function (message, n) {
        return (message[2] - runStats.messages[n][2]) / M;
      }).reduce(function (x, y) { 
        return x + y; 
      }, 0)) / (runStats.messages.length - M);

    return {
      elapsedSeconds: elapsed / 1000,
      totalMessages: runStats.messages.length,
      averageMessagesPerSecond: 1000 / averageReceiveOverhead
    }
  }

  function displayStats(stats) {
    $('#elapsed').text(stats.elapsedSeconds);
    $('#totalmessages').text(stats.totalMessages);
    $('#throughput').text(stats.averageMessagesPerSecond);
  }
