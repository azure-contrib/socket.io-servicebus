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

var should = require('should');
var sinon = require('sinon');

var SbStore = require('../lib/sbstore');

describe('logging', function () {
  var store;
  var logger;
  var serviceBusService;
  var recvFuncs;
  var clock;

  beforeEach(function () {
    clock = sinon.useFakeTimers();
    recvFuncs = [];

    serviceBusService = {
      receiveSubscriptionMessage: function (topic, sub, callback) {
        recvFuncs.push(callback);
      },
      sendTopicMessage: sinon.spy(),
      createSubscription: function (topic, subscriptions, options, cb) { cb(); },
      createTopic: sinon.stub().callsArg(2),
      withFilter: function (filter) { return this; },
      host: 'testnamespace.servicebus.example'
    };

    logger = {
      error: sinon.spy(),
      warn: sinon.spy(),
      info: sinon.spy(),
      debug: sinon.spy()
    };

    store = new SbStore({
      nodeId: 'logtestnode',
      topic: 'testtopic',
      subscription: 'testsubscription',
      serviceBusService: serviceBusService,
      numReceives: 2,
      logger: logger,
      flushIntervalMS: 100
    });
  });

  afterEach(function () {
    clock.restore();
  });

  it('should log subscription info on creation', function () {
    logger.info.calledWith('Service Bus Store created', 
      'host:' + serviceBusService.host,
      'topic:testtopic').should.be.true;
  });

  it('should log when poll request starts up', function () {
    logger.info.calledWith('Service Bus poll started', 'num:0').should.be.true;
    logger.info.calledWith('Service Bus poll started', 'num:1').should.be.true;
  });

  it('should log when polling stops', function (done) {
    store.destroy(function () {
      logger.info.calledWith('Service Bus poll stopped', 'num:1').should.be.true;
      logger.info.calledWith('Service Bus poll stopped', 'num:0').should.be.true;
      done();
    });

    // trigger the receive poll callbacks so they exit
    recvNothing();
    recvNothing();
  });

  it('should log when poll completes without a message', function () {
    recvNothing();
    logger.debug.calledWith('Service Bus poll: no message').should.be.true;
  });

  it('should log when a bad message is received', function () {
    var message = {
      brokerProperties: {
        CorrelationId: 'sourceNode',
        Label: 'aMessage',
        SequenceNumber: 1
      },
      body: 'This will not deserialize'
    };

    recv(message);
    logger.warn.calledWith('Service Bus bad message received', 
      'CorrelationId:sourceNode', 'Label:aMessage', 'SequenceNumber:1')
      .should.be.true;
  });

  it('should log when good message is received', function () {
    var message = {
      brokerProperties: {
        CorrelationId: 'sourceNode',
        Label: 'aMessage',
        SequenceNumber: 2
      },
      body: JSON.stringify([1, 2, 3])
    };

    recv(message);

    logger.info.calledWith('Service Bus received message',
      'from:sourceNode', 'message:aMessage').should.be.true;
  });

  it('should log details when good message is received', function () {
    var message = {
      brokerProperties: {
        CorrelationId: 'sourceNode',
        Label: 'aMessage',
        SequenceNumber: 2,
        EnqueuedTimeUtc: new Date().toString(),
        MessageId: 1234
      },
      body: JSON.stringify([1, 2, 3])
    };
    message.brokerProperties.Size = message.body.length;

    recv(message);

    logger.debug.calledWith('Service Bus received message',
      'messageId:' + message.brokerProperties.MessageId).should.be.true;
  });

  it('should log failure to send', function () {
    store.publish('aMessage', 1, 2, 3);
    // message batcher flush 
    clock.tick(300);

    var sendCallback = serviceBusService.sendTopicMessage.getCall(0).args[2];
    sendCallback('Service Bus send failed');

    logger.error.calledWith('Service Bus send to topic failed',
      'topic:testtopic', 'error:Service Bus send failed').should.be.true;
  });

  // Helpers for sending messages
  function recvNothing() {
    var recvFunc = recvFuncs.shift();
    recvFunc('No messages to receive');
  }

  function recv(message) {
    var recvFunc = recvFuncs.shift();
    recvFunc(null, message);
  }
});
