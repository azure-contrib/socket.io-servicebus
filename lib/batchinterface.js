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

var ServiceBusInterface = require('./servicebusinterface');

module.exports = BatchInterface;

function BatchInterface(nodeId, serviceBusService, topic, subscription) {
  this.pending = [];
  this.sb = this.createServiceBusInterface(nodeId, serviceBusService, topic, subscription);
  this.started = false;
}

BatchInterface.prototype.send = function(name, args) {
  this.pending.push([name, args]);
};

BatchInterface.prototype.flush = function() {
  if (this.pending.length > 0) {
    this.sb.send('batch', this.pending);
    this.pending = [];
  }
};

BatchInterface.prototype.start = function(handler) {
  if (!this.started) {
    this.receiveHandler = handler;
    setInterval(this.flush.bind(this), 250);
    this.sb.start(this.receiveMessage.bind(this));
    this.started = true;
  }
};

BatchInterface.prototype.receiveMessage = function(nodeId, name, batch) {
  for(var i = 0, len = batch.length; i < len; ++i) {
    this.receiveHandler(nodeId, batch[i][0], batch[i][1]);
  }  
};

BatchInterface.prototype.createServiceBusInterface = function createServiceBusInterface(nodeId, serviceBusService, topic, subscription) {
  return new ServiceBusInterface(nodeId, serviceBusService, topic, subscription);
};

BatchInterface.prototype.on = function(event, listener) {
  return this.sb.on(event, listener);
};
