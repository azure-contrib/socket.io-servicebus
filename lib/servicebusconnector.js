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
  , ExponentialRetryPolicyFilter = azure.ExponentialRetryPolicyFilter
  , util = require('util');

var DEFAULT_SIMULTANEOUS_RECEIVES = 4;
var DEFAULT_NUM_RETRIES = 3;
var DEFAULT_RETRY_INTERVAL_MS = 1000;

module.exports = ServiceBusConnector;

function ServiceBusConnector(options) {
  this.nodeId = options.nodeId;
  this.serviceBusReceiver = options.serviceBusService;
  this.serviceBusSender = options.serviceBusService.withFilter(createRetryFilter(options));
  this.topic = options.topic;
  this.subscription = options.subscription;
  this.numReceives = options.numReceives || DEFAULT_SIMULTANEOUS_RECEIVES;
  this.receivesRunning = 0;
}

util.inherits(ServiceBusConnector, EventEmitter);

ServiceBusConnector.prototype.start = function () {
  var self = this;
  this.shouldStop = false;

  function pollSb() {
    self.serviceBusReceiver.receiveSubscriptionMessage(self.topic, self.subscription, function (err, receivedMessage) {

      self.emit('poll', err, receivedMessage);

      if (!err) {
        var msg = self.unpackMessage(receivedMessage);
        self.emit('message', msg.nodeId, msg.name, msg.args, msg.seq);
      }

      if (!self.shouldStop) {
        pollSb();
      } else {
        --self.receivesRunning;
        if(self.receivesRunning === 0) {
          self.stopCallback && self.stopCallback(null);
        }
      }
    });
  }

  for(var i = 0; i < this.numReceives; ++i) {
    pollSb();
  }
  this.receivesRunning = this.numReceives;
}

ServiceBusConnector.prototype.stop = function (cb) {
  this.shouldStop = true;
  this.stopCallback = cb;
}

ServiceBusConnector.prototype.send = function (name, args) {
  var self = this;
  var message = this.packMessage(name, args);
  this.serviceBusSender.sendTopicMessage(this.topic, message, function (err) {

    if (err) {
      self.emit('sberror', new Error('Failed to write to service bus on topic %s, err = %s', self.topic, util.inspect(err)));
    }
  });
}

ServiceBusConnector.prototype.packMessage = function(name, args) {
  return {
    body: JSON.stringify(args),
    brokerProperties: {
      CorrelationId: this.nodeId,
      Label: name
    }};
}

ServiceBusConnector.prototype.unpackMessage = function(message) {
  return {
    name: message.brokerProperties.Label,
    nodeId: message.brokerProperties.CorrelationId,
    args: JSON.parse(message.body),
    seq: +message.brokerProperties.SequenceNumber
  };
}

function createRetryFilter(options) {
  var numRetries = (options && options.numRetries) || DEFAULT_NUM_RETRIES;
  var retryInterval = (options && options.retryIntervalMS) || DEFAULT_RETRY_INTERVAL_MS;

  return new ExponentialRetryPolicyFilter(numRetries, retryInterval);
}
