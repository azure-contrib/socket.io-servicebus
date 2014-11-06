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

var Adapter = require('socket.io-adapter');
var util = require('util');
var uuid = require('node-uuid');
var azure = require('azure');
var MessageBatcher = require('./messagebatcher');
var MessageSequencer = require('./messagesequencer');
var ServiceBusConnector = require('./servicebusconnector');

/**
 * Returns a constructor for creating a socket.io-adapter that uses Azure's ServiceBus for
 * cross instance communication
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
function sbAdapterFactory(options) {

  if (options.connectionString && options.serviceBusService) {
    throw new Error('Should specify connection string or serviceBusService object, not both');
  }

  if (!(options.connectionString || options.serviceBusService)) {
    throw new Error('Must specify one of connectionString or serviceBusService in options');
  }

  if (options.connectionString) {
    options.serviceBusService = azure.createServiceBusService(options.connectionString);
  }

  var nodeId = options.nodeId = options.nodeId || uuid.v4();
  var log = options && options.logger;

  var client = new MessageBatcher(options, new MessageSequencer(options, new ServiceBusConnector(options)));

  /**
   * The ServiceBus Adapter Constructor.
   * @param nsp {String} the namespace name, forwarded to the Adapter constructor
   * @api public
   * @constructor
   */
  function ServiceBusAdapter(nsp) {
    Adapter.call(this, nsp);
    this.sbClient = client;
    this.nodeId = nodeId;
    var self = this;

    if (log) {
      log.info('Service Bus Adapter created', 'host:', options.serviceBusService.host,
        'topic:' + options.topic);
    }

    //setup message listener
    client.on('message', function (sourceNodeId, name, args) {
      if (sourceNodeId !== nodeId && name === 'iomsg') {
        args.push(true);
        self.broadcast.apply(self, args);
      }
    });

    //start the client listening on servicebus
    client.start(function (err) {
      self.emit('started', err);
    });
  }

  util.inherits(ServiceBusAdapter, Adapter);

  /**
   * Broadcasts a packet.
   *
   * @param {Object} packet to emit
   * @param {Object} options
   * @param {Boolean} whether the packet came from another node
   * @api public
   */
  ServiceBusAdapter.prototype.broadcast = function (packet, opts, remote) {
    Adapter.prototype.broadcast.call(this, packet, opts);
    if (!remote) {
      this.sbClient.send('iomsg', [packet, opts]);
    }
  };

  return ServiceBusAdapter;

}

module.exports = sbAdapterFactory;
