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
  , util = require('util')
  , uuid = require('uuid');

var DEFAULT_SIMULTANEOUS_RECEIVES = 4;
var DEFAULT_NUM_RETRIES = 3;
var DEFAULT_RETRY_INTERVAL_MS = 1000;

module.exports = ServiceBusConnector;

function ServiceBusConnector(options) {
  this.nodeId = options.nodeId;
  this.serviceBusReceiver = options.serviceBusService;
  this.serviceBusSender = options.serviceBusService.withFilter(createRetryFilter(options));
  this.topic = options.topic;
  this.subscription = options.subscription || uuid.v4();
  this.numReceives = options.numReceives || DEFAULT_SIMULTANEOUS_RECEIVES;
  this.receivesRunning = 0;
  this.log = options.logger;
}

util.inherits(ServiceBusConnector, EventEmitter);

ServiceBusConnector.prototype.start = function () {
  var self = this;
  this.shouldStop = false;

  function pollSb() {
    self.serviceBusReceiver.receiveSubscriptionMessage(self.topic, self.subscription, function (err, receivedMessage) {

      if (err === 'No messages to receive') {
        self.log && self.log.debug('Service Bus poll: no message');
      }

      if (!err) {
        var msg = self.unpackMessage(receivedMessage);
        if (msg.args !== null) {
          self.emit('message', msg.nodeId, msg.name, msg.args, msg.seq);
        } else {
          self.emit('badmessage', msg.nodeId, msg.name, msg.seq);
        }
      }

      if (!self.shouldStop) {
        pollSb();
      } else {
        --self.receivesRunning;
        self.log && self.log.info('Service Bus poll stopped', 'num:' + self.receivesRunning);
        if(self.receivesRunning === 0) {
          self.stopCallback && self.stopCallback(null);
        }
      }
    });
  }

  this.ensureSubscriptionExists(function(err) {
    if (err) {
      throw err;
    }
    for(var i = 0; i < self.numReceives; ++i) {
      pollSb();
      self.log && self.log.info('Service Bus poll started', 'num:' + i);
    }
    self.receivesRunning = self.numReceives;
  });


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
      self.log && self.log.error('Service Bus send to topic failed',
        'topic:' + self.topic, 'error:' + err.toString());
    }
  });
}

ServiceBusConnector.prototype.packMessage = function(name, args) {
  return {
    body: JSON.stringify(args),
    brokerProperties: {
      CorrelationId: this.nodeId,
      Label: name
    }
  };
}

ServiceBusConnector.prototype.unpackMessage = function(message) {
  var result = {
    name: message.brokerProperties.Label,
    nodeId: message.brokerProperties.CorrelationId,
    seq: +message.brokerProperties.SequenceNumber,
    args: null
  };

  try {
    result.args = JSON.parse(message.body);
    this.log && this.log.info('Service Bus received message', 'from:' + result.nodeId, 'message:' + result.name);
    this.log && this.log.debug('Service Bus received message', 'messageId:' + message.brokerProperties.MessageId);
    return result;
  } catch (ex) {
    // Issue unpacking the message, assume it's bad and toss it
    this.log && this.log.warn('Service Bus bad message received',
      'CorrelationId:' + message.brokerProperties.CorrelationId,
      'Label:' + message.brokerProperties.Label,
      'SequenceNumber:' + message.brokerProperties.SequenceNumber,
      'size:' + message.brokerProperties.Size,
      'enqueuedTime:' + message.brokerProperties.EnqueuedTimeUtc,
      'messageId:' + message.brokerProperties.MessageId);
    return result;
  }
}

ServiceBusConnector.prototype.ensureSubscriptionExists = function(callback) {
  var self = this;
  var subscriptionOptions = {
    AutoDeleteOnIdle: 'PT5M'
  };
  self.serviceBusReceiver.createSubscription(self.topic, self.subscription, subscriptionOptions, function(err){
    if(err){
        this.log && this.log.error('Error creating subscription', 'sub:' + self.subscription, 'error:' , err.toString());
        callback(err);
     }
     this.log && this.log.info('Subscription created', 'sub:' + self.subscription);
     callback();
  });
}

function createRetryFilter(options) {
  var numRetries = (options && options.numRetries) || DEFAULT_NUM_RETRIES;
  var retryInterval = (options && options.retryIntervalMS) || DEFAULT_RETRY_INTERVAL_MS;

  return new ExponentialRetryPolicyFilter(numRetries, retryInterval);
}
