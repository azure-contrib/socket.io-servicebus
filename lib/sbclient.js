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

function Client() {
  io.Store.Client.apply(this, arguments);
  this.data = {};
}

util.inherits(Client, io.Store.Client);
module.exports = Client;

// Helper function to invoke callbacks
// Invoke on next event loop turn in case
// we expand to storing this data off the box
// and need actual async.
function invoke(fn) {
  if (fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    process.nextTick(function() {
      fn.apply(null, args);
    });
  }
}

/**
 * Get data stored under a key
 *
 * @param {Object} key key to retrieve data for
 * @param {function(err, value)} fn
 *     callback function that received the retrieved value
 *
 * @return {Client} this client object
 */
Client.prototype.get = function (key, fn) {
  var self = this;
  invoke(fn, null, self.data[key] || null);
  return this;
};

/**
 * Store client data for a key
 *
 * @param {Object} key key to store data under
 * @param {Object} value value to store
 * @param {function(err)} fn callback function when set completed
 *
 * @return {Client} this client object.
 */
Client.prototype.set = function (key, value, fn) {
  this.data[key] = value;
  invoke(fn, null);
  return this;
};

/**
 * Check if data for a key has been stored
 *
 * @param {Object} key
 *    key to check for
 *
 * @param {function(err, hasKey)} fn
 *    callback function that receives result
 *
 * @return {Client} this client object
 */
Client.prototype.has = function (key, fn) {
  invoke(fn, null, key in this.data);
  return this;
};

/**
 * Delete data for a key
 *
 * @param {Object} key
 *    key to delete
 *
 * @param {function(err)} fn
 *    callback function invoked when deletion is done
 *
 * @return {Client}
 *    this client object
 */
Client.prototype.del = function (key, fn) {
  delete this.data[key];
  invoke(fn, null);
  return this;
};

/**
 * Delete all data stored by this client
 *
 * @param {Number} expiration
 *    timeout in seconds before deleting data. If
 *    not specified, deletes data immediately.
 *
 * @return {Client}
 *    this client object
 */
Client.prototype.destroy = function (expiration) {
  if('number' !== typeof expiration) {
    this.data = {};
  } else {
    var self = this;
    setTimeout(function () {
      self.data = {};
    }, expiration * 1000);
  }
  return this;
};

