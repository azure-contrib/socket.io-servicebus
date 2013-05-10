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

var events = require('events');
var util = require('util');

var DEFAULT_FLUSH_INTERVAL_MS = 250;

function MessageBatcher(options, inner) {
  this.pending = [];
  this.sb = inner;
  this.started = false;
  this.flushIntervalMS = (options && options.flushIntervalMS) || DEFAULT_FLUSH_INTERVAL_MS;
  this.forwardLogEvents();
  this.sb.on('message', this.receiveMessage.bind(this));
}

util.inherits(MessageBatcher, events.EventEmitter);

module.exports = MessageBatcher;

MessageBatcher.prototype.start = function(callback) {
  var self = this;
  if (!this.started) {
    this.flushCancellationToken = setInterval(this.flush.bind(this), this.flushIntervalMS);
    this.sb.start(function (err) {
      if (!err) {
        self.started = true;
      }
      if (callback) {
        callback(err);
      }
    });
  }
};

MessageBatcher.prototype.stop = function (cb) {
  if (this.started) {
    this.started = false;
    clearInterval(this.flushCancellationToken);
    this.sb.stop(cb);
  }
};

/*
 * Send side of interface
 */

MessageBatcher.prototype.send = function(name, args) {
  this.pending.push([name, args]);
};

MessageBatcher.prototype.flush = function() {
  if (this.pending.length > 0) {
    this.sb.send('batch', this.pending);
    this.pending = [];
  }
};

/*
 * Receive side of interface
 */

MessageBatcher.prototype.receiveMessage = function(nodeId, name, batch) {
  for(var i = 0, len = batch.length; i < len; ++i) {
    this.emit('message', nodeId, batch[i][0], batch[i][1]);
  }
};

/*
 * Internals
 */

MessageBatcher.prototype.forwardLogEvents = function() {
  var self = this;

  function forward() {
    self.emit.apply(null, arguments);
  }

  this.sb.on('poll', forward.bind(null, 'poll'));
  this.sb.on('sberror', forward.bind(null, 'sberror'));
};
