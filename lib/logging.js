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

var util = require('util');

/**
 * Convenience function to create listener objects
 * which wire up to the events on the store
 * and service bus interface.
 *
 * @param {object} handlers
 *    object containing handlers for the various
 *    events from the store & service bus. Looks
 *    for methods with the following names:
 *
 *    onsubscribe(name, consumer) - a new subscriber to a store message
 *    onreceived(name, message) - message has been received, varargs for rest
 *                       of message arguments
 *    onunsubscribe(name, consumer) - unsubscribe from store
 *    onpoll(err, message) - poll cycle on service bus completed
 *    onsberror(err) - error when interacting with service bus
 *
 */

function makeListener(handlers) {
  var storeEvents = ['subscribe', 'unsubscribe', 'received'];
  var sbEvents = ['poll', 'sberror'];

  function wireHandlers(emitter, eventNames) {
    eventNames.forEach(function (eventName) {
      var handlerFunc = handlers['on' + eventName];
      if (handlerFunc) {
        emitter.on(eventName, handlerFunc.bind(handlers));
      }    
    });
  }

  var listener = {
    store: function (store) {
      wireHandlers(store, storeEvents);
      if (handlers.init) {
        handlers.init(store);
      }
    },

    sb: function (sb) {
      wireHandlers(sb, sbEvents);
    }
  };

  return listener;
}

/**
 * Logger object which outputs everything to the console
 *
 */
 var consoleLog = makeListener({
  init: function (store) {
    this.nodeId = store.nodeId;
  },

  onsubscribe: function (name, consumer) {
    log('SbStore has new subscriber for %s events', name);
  },

  onreceived: function (name, message) {
    log('SbStore nodeId %s received message of type %s from node %s',
      this.nodeId, message.name, message.nodeId);
  },

  onunsubscribe: function (name, consumer) {
    log('SbStore unsubscribing from %s', name);
  },

  onpoll: function (err, message) {
    if (err === 'No messages to receive') {
      log('Service bus poll completed, no message');
    } else {
      log('Service bus poll completed, err = %s, message = %s', err, util.inspect(message));
    }
  },

  onsberror: function (err) {
    log('Service bus error: %s', err.message);
  }
 });

// helper for formatting

function log() {
  console.log(util.format.apply(null, arguments));
}

module.exports = {
  makeListener: makeListener,
  console: consoleLog
};
