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

var EventEmitter = require('events').EventEmitter;
var util = require('util');

function MessageSequencer(options, inner) {
  this.inner = inner;
  this.started = false;
  this.nextExpectedMessageNumber = null;
  this.pendingMessages = [];

  inner.on('message', this.receiveMessage.bind(this));
  inner.on('badmessage', this.receiveBadMessage.bind(this));
}

util.inherits(MessageSequencer, EventEmitter);
module.exports = MessageSequencer;

MessageSequencer.prototype.start = function(callback) {
  var self = this;
  callback = callback || function () { };
  if (!this.started) {
    this.inner.start(function (err) {
      if (!err) {
        self.started = true;
      }
      callback(err);
    });
  } else {
    callback();
  }
};

MessageSequencer.prototype.stop = function(callback) {
  if (this.started) {
    this.started = false;
    this.inner.stop(callback);
  }
};

MessageSequencer.prototype.send = function(name, args) {
  this.inner.send(name, args);
};

MessageSequencer.prototype.receiveMessage = function(sourceNodeId, name, message, seq) {
  this.processMessage([sourceNodeId, name, message, seq]);
};

MessageSequencer.prototype.receiveBadMessage = function(sourceNodeId, name, seq) {
  var badMsg = [sourceNodeId, name, null, seq];
  badMsg.isBadMessage = true;
  this.processMessage(badMsg);
};

MessageSequencer.prototype.processMessage = function(message) {
  var seq = message[3];
  if (this.nextExpectedMessageNumber === null) {
    this.nextExpectedMessageNumber = seq;
  }

  if (seq >= this.nextExpectedMessageNumber) {
    this.addPendingMessage(message);
    this.sendPendingMessages();
  }
};

MessageSequencer.prototype.addPendingMessage = function(message) {
  this.pendingMessages.push(message);
  this.pendingMessages.sort(function (a, b) { return a[3] - b[3]; });
};

MessageSequencer.prototype.sendPendingMessages = function() {
  while (this.pendingMessages.length > 0 && this.pendingMessages[0][3] === this.nextExpectedMessageNumber)
  {
    if (!this.pendingMessages[0].isBadMessage) {
      this.emit.apply(this, ['message'].concat(this.pendingMessages[0]));
    }
    this.pendingMessages.shift();
    ++this.nextExpectedMessageNumber;
  }
};

