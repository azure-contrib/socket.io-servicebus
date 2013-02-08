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

// Interface layer between store and service bus

var azure = require('azure')
  , EventEmitter = require('events').EventEmitter
  , Formatter = require('./formatter')
  , util = require('util');

module.exports = ServiceBusInterface;

function ServiceBusInterface(nodeId, serviceBusService, topic, subscription) {
  this.nodeId = nodeId;
  this.serviceBusService = serviceBusService;
  this.topic = topic;
  this.subscription = subscription;
  this.formatter = new Formatter(nodeId);
}

util.inherits(ServiceBusInterface, EventEmitter);

ServiceBusInterface.prototype.start = function (messageHandler) {
  var self = this;
  this.shouldStop = false;

  function pollSb() {
    self.serviceBusService.receiveSubscriptionMessage(self.topic, self.subscription, function (err, receivedMessage) {
      self.emit('poll', err, receivedMessage);

      if (!err) {
        var msg = self.formatter.unpack(receivedMessage);
        messageHandler(msg.nodeId, msg.name, msg.args);
      }

      if (!self.shouldStop) {
        process.nextTick(pollSb);
      } else {
        self.stopCallback && self.stopCallback(null);
      }
    });
  }

  pollSb();
}

ServiceBusInterface.prototype.stop = function (cb) {
  this.shouldStop = true;
  this.stopCallback = cb;
}

ServiceBusInterface.prototype.send = function (name, args) {
  
  var message = this.formatter.pack(name, args);
  this.serviceBusService.sendTopicMessage(this.topic, message, function (err) {
    if (err) {
      this.emit('sberror', new Error('Failed to write to service bus on topic %s, err = %s', this.topic, util.inspect(err)));
    }
  });
}
