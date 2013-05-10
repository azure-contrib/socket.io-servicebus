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

var io = require('socket.io');
var util = require('util');
var uuid = require('node-uuid');
var azure = require('azure');
var Client = require('./sbclient');
var MessageBatcher = require('./messagebatcher');
var MessageSequencer = require('./messagesequencer');
var ServiceBusConnector = require('./servicebusconnector');

/**
 * construct the store that uses Service Bus to communicate
 *
 * @param {object} options creation options
 *   - serviceBusService: service to use when connecting to service bus
 *   - connectionString: Service bus connection string. This or serviceBusService is required
 *   - nodeId: unique string identifying this node, defaults to random uuid
 *   - topic: service bus topic name to communicate over
 *   - subscription: service bus subscription to listen on for messages
 *   - logger: logger object to use if any; should be the same logger used by socket.io itself.
 *   - listeners: optional array of listener objects to hook up. Primarily used for loggers
 */
function ServiceBusStore(options) {
  var self = this;
  io.Store.apply(this, arguments);

  this.log = options && options.logger;

  this.nodeId = (options && options.nodeId) || uuid.v4();
  this.sb = this.createServiceBusConnector(options);

  if (this.log) {
    this.log.info('Service Bus Store created', 'host:' + this.serviceBusService.host,
      'topic:' + options.topic);
  }

  this.subscribers = {};

  this.sb.on('message', this.receiveMessage.bind(this));
  this.sb.start(function (err) {
    self.emit('started', err);
  });
}

util.inherits(ServiceBusStore, io.Store);
exports = module.exports = ServiceBusStore;
ServiceBusStore.Client = Client;

/**
 * Publish a message
 *
 * @param {String} name name of message
 *
 * other arguments are arguments for the message
 *
 * @api private
 */
ServiceBusStore.prototype.publish = function (name) {
  var argsArray = Array.prototype.slice.call(arguments, 0);
  var args = [name, argsArray.slice(1)];
  this.sb.send.apply(this.sb, args);
  this.emit.apply(this, ['publish'].concat(argsArray));
};

/**
 * Subscribe to received messages
 *
 * @param {string} name name of message received
 *
 * @param {function} consumer function to call when message is received
 *
 * @api private
 */
ServiceBusStore.prototype.subscribe = function (name, consumer) {
  var subscribers = this.subscribers[name] || [];
  subscribers.push(consumer);
  this.subscribers[name] = subscribers;

  this.emit('subscribe', name, consumer);
};

ServiceBusStore.prototype.unsubscribe = function (name, consumer) {
  var subscribers = this.subscribers[name] || [];
  subscribers = subscribers.filter(function (item) { return item !== consumer; });
  this.subscribers[name] = subscribers;

  this.emit('unsubscribe', name, consumer);
};

ServiceBusStore.prototype.destroy = function (stoppedCallback) {
  var self = this;
  this.sb.stop(function () {
    io.Store.prototype.destroy.call(self);
    self.subscribers = {};
    if (stoppedCallback) {
      stoppedCallback();
    }
  });
};

ServiceBusStore.prototype.receiveMessage = function (sourceNodeId, name, args) {
  this.emit.apply(this, ['received', sourceNodeId, name, args]);
  if (sourceNodeId !== this.nodeId) {
    var subscribers = this.subscribers[name] || [];
    subscribers.forEach(function (sub) {
      sub.apply(null, args);
    });
  }
};

ServiceBusStore.prototype.createServiceBusConnector = function createServiceBusConnector(options) {
  if (options.connectionString && options.serviceBusService) {
    throw new Error('Should specify connection string or serviceBusService object, not both');
  }

  if (!options.connectionString && !options.serviceBusService) {
    throw new Error('Must specify one of connectionString or serviceBusService in options');
  }

  if (options.connectionString) {
    options.serviceBusService = azure.createServiceBusService(options.connectionString);
  }

  this.serviceBusService = options.serviceBusService;
  options.logger = this.log;
  options.nodeId = this.nodeId;

  return new MessageBatcher(options,
    new MessageSequencer(options,
      new ServiceBusConnector(options)));
};
