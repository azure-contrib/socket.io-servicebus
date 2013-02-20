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

var EventEmitter = require('events').EventEmitter
  , util = require('util');

module.exports = SequencingInterface;

function SequencingInterface(options, inner) {
  this.inner = inner;
  this.started = false;
  this.messageMetadata = { seq: 0, next: 1};
  this.pendingMessages = {};

  inner.on('message', this.receiveMessage.bind(this));
}

util.inherits(SequencingInterface, EventEmitter);

SequencingInterface.prototype.start = function() {
  if (!this.started) {
    this.inner.start();
    this.started = true;
  }
};

SequencingInterface.prototype.stop = function() {
  if (this.started) {
    this.started = false;
    this.inner.stop();
  }
};

SequencingInterface.prototype.send = function(name, args) {
  this.inner.send(name, args, this.messageMetadata);
  this.nextSeq();
};

SequencingInterface.prototype.receiveMessage = function(sourceNodeId, name, message, metadata) {
  var processFunc = this.processMessageFromKnownNode;
  if (!this.pendingMessages[sourceNodeId]) {
    processFunc = this.processMessageFromNewNode;
  }
  processFunc.call(this, sourceNodeId, name, message, metadata);
  this.sendPendingMessages(sourceNodeId);
};

SequencingInterface.prototype.processMessageFromNewNode = function(sourceNodeId, name, message, metadata) {
  this.pendingMessages[sourceNodeId] = {
    waitingForMessage: metadata.seq,
    messages: {

    }
  };
  this.pendingMessages[sourceNodeId].messages[metadata.seq] = [name, message, metadata];
};

SequencingInterface.prototype.processMessageFromKnownNode = function(sourceNodeId, name, message, metadata) {
  if (metadata.seq >= this.pendingMessages[sourceNodeId].waitingForMessage) {
    this.pendingMessages[sourceNodeId].messages[metadata.seq] = [name, message, metadata];  
  }
};

SequencingInterface.prototype.sendPendingMessages = function(sourceNodeId) {
  var pending = this.pendingMessages[sourceNodeId];
  var seq = pending.waitingForMessage;
  while (pending.messages[seq]) {
    this.emit.apply(this, ['message', sourceNodeId].concat(pending.messages[seq]));
    pending.waitingForMessage = pending.messages[seq][2].next;
    delete pending.messages[seq];
    seq = pending.waitingForMessage;
  }
};

SequencingInterface.prototype.nextSeq = function() {
  this.messageMetadata = { seq: this.messageMetadata.next, next: this.messageMetadata.next + 1 };
};