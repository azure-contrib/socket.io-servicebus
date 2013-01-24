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

var io = require('socket.io')
  , util = require('util');

exports = module.exports = ServiceBusStore;
ServiceBusStore.Client = Client;

function ServiceBusStore() {
  io.Store.apply(this, arguments);
}

util.inherits(ServiceBusStore, io.Store);

function Client() {
  io.Store.Client.apply(this, arguments);
  this.data = {};
}

util.inherits(ServiceBusStore.Client, io.Store.Client);

/**
 * Get data stored under a key
 *
 * @param {object} key key to retrieve data for
 * @param {function(err, value)} fn 
 *     callback function that received the retrieved value
 *
 * @return {Client} this client object
 */
Client.prototype.get = function (key, fn) {
  var self = this;
  process.nextTick(function () {
    fn(null, self.data[key] || null);
  });
  return this;
}

/**
 * Store client data for a key
 *
 * @param {object} key key to store data under
 * @param {object} value value to store
 * @param {function(err)} fn callback function when set completed
 *
 * @return {Client} this client object.
 */
Client.prototype.set = function (key, value, fn) {
  var self = this;
  this.data[key] = value;
  if (fn) {
    process.nextTick(function() { fn(null); });
  }
  return this;
}

/**
 * Check if data for a key has been stored
 *
 * @param {object} key key to check for
 * @param {function(err, hasKey)} fn
 *     callback function that receives result
 *
 * @return {Client} this client object
 */

Client.prototype.has = function (key, fn) {
  var self = this;
  process.nextTick(function () {
    fn(null, key in self.data);
  });
  return this;
}

Client.prototype.del = function (key, fn) {
  delete this.data[key];
  if (fn) {
    process.nextTick(function () {
      fn(null);
    });
  }
  return this;
}
