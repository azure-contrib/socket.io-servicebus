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

var events = require('events')
  , util = require('util');

module.exports = BatchInterface;

function BatchInterface(options, inner) {
  this.pending = [];
  this.sb = inner;
  this.started = false;
  this.forwardLogEvents();
  this.sb.on('message', this.receiveMessage.bind(this));
}

util.inherits(BatchInterface, events.EventEmitter);

BatchInterface.prototype.start = function() {
  if (!this.started) {
    this.flushInterval = setInterval(this.flush.bind(this), 250);
    this.sb.start();
    this.started = true;
  }
};

BatchInterface.prototype.stop = function (cb) {
  if (this.started) {
    this.started = false;
    clearInterval(this.flushInterval);
    this.sb.stop(cb);
  }
}

/*
 * Send side of interface
 */

BatchInterface.prototype.send = function(name, args) {
  this.pending.push([name, args]);
};

BatchInterface.prototype.flush = function() {
  if (this.pending.length > 0) {
    this.sb.send('batch', this.pending);
    this.pending = [];
  }
};

/*
 * Receive side of interface
 */

BatchInterface.prototype.receiveMessage = function(nodeId, name, batch) {
  for(var i = 0, len = batch.length; i < len; ++i) {
    this.emit('message', nodeId, batch[i][0], batch[i][1]);
  }  
};

/*
 * Internals
 */

BatchInterface.prototype.forwardLogEvents = function() {
  var self = this;

  function forward() {
    self.emit.apply(null, arguments);
  }

  this.sb.on('poll', forward.bind(null, 'poll'));
  this.sb.on('sberror', forward.bind(null, 'sberror'));
};
