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

// Interface layer between store and service bus

var azure = require('azure')
  , EventEmitter = require('events').EventEmitter
  , util = require('util');

module.exports = ServiceBusConnector;

function ServiceBusConnector(options) {
  this.nodeId = options.nodeId;
  this.serviceBusService = options.serviceBusService;
  this.topic = options.topic;
  this.subscription = options.subscription;
}

util.inherits(ServiceBusConnector, EventEmitter);

ServiceBusConnector.prototype.start = function () {
  var self = this;
  this.shouldStop = false;

  function pollSb() {
    self.serviceBusService.receiveSubscriptionMessage(self.topic, self.subscription, function (err, receivedMessage) {
      self.emit('poll', err, receivedMessage);

      if (!err) {
        var msg = self.unpackMessage(receivedMessage);
        self.emit('message', msg.nodeId, msg.name, msg.args, msg.metadata);
      }

      if (!self.shouldStop) {
        pollSb();
      } else {
        self.stopCallback && self.stopCallback(null);
      }
    });
  }

  pollSb();
}

ServiceBusConnector.prototype.stop = function (cb) {
  this.shouldStop = true;
  this.stopCallback = cb;
}

ServiceBusConnector.prototype.send = function (name, args, metadata) {
  var self = this;
  var message = this.packMessage(name, args, metadata);
  this.serviceBusService.sendTopicMessage(this.topic, message, function (err) {
    if (err) {
      self.emit('sberror', new Error('Failed to write to service bus on topic %s, err = %s', self.topic, util.inspect(err)));
    }
  });
}

ServiceBusConnector.prototype.packMessage = function(name, args, metadata) {
  return {
    body: JSON.stringify(args),
    brokerProperties: {
      CorrelationId: this.nodeId,
      Label: name
    },
    customProperties: metadata
  };
}

ServiceBusConnector.prototype.unpackMessage = function(message) {
  return {
    name: message.brokerProperties.Label,
    nodeId: message.brokerProperties.CorrelationId,
    args: JSON.parse(message.body),
    metadata: message.customProperties
  };
}
