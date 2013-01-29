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

var sbMocks = require('./mocks/servicebuscreation')
  , should = require('should')
  , sinon = require('sinon')
  , util = require('util');

var io = require('socket.io')
  , SbStore = require('../lib/sbstore')
  , Formatter = require('../lib/formatter');

describe('Service Bus Store objects', function() {

  before(function () {
    sbMocks.mockServiceBusCreation();
  });

  after(function () {
    sbMocks.undoServiceBusCreationMocks();
  });

  describe('when creating', function () {
    var store;

    before(function () {
      store = new SbStore({});
    });

    it('should create a formatter', function () {
      store.formatter.should.exist;
      store.formatter.should.be.an.instanceof(Formatter);
      store.nodeId.should.equal(store.formatter.nodeId);
    });

    it('should start the service bus polling', function () {
      store.sb.start.called.should.be.true;
    });
  });

  describe('when publishing', function () {
    var formatter = new Formatter('some-node');
    var packMethod = formatter.pack;
    var unpackMethod = formatter.unpack;

    sinon.stub(formatter, 'pack', packMethod);

    sinon.stub(formatter, 'unpack', unpackMethod);

    var store;
    var eventsEmitted = [];

    before(function () {
      store = new SbStore({
        messageFormatter: formatter,
        });

      store.on('publish', function (name) {
        var args = Array.prototype.slice.call(arguments, 1);
        eventsEmitted.push({event: 'publish', name: name, args: args });
        });
      store.publish('message', 1, 2, 3);
    });

    it('should package message to publish', function () {
      formatter.pack.calledOnce.should.be.true;
    });

    it('should send message to servicebus topic', function () {
      store.sb.send.calledOnce.should.be.true;
      var call = store.sb.send.getCall(0);
      var args = JSON.parse(call.args[0].body);
      args.should.have.length(3);
      args[0].should.equal(1);
      args[1].should.equal(2);
      args[2].should.equal(3);
    });

    it('should emit local publish event', function () {
      eventsEmitted.should.have.length(1);
      eventsEmitted[0].event.should.equal('publish');
      eventsEmitted[0].name.should.equal('message');
      var args = eventsEmitted[0].args;
      args.should.have.length(3);
      args[0].should.equal(1);
      args[1].should.equal(2);
      args[2].should.equal(3);
    });
  });

  describe('when receiving', function () {
    var formatter = new Formatter('some-node-id');

    var store;

    var subscriber1 = sinon.spy();
    var subscriber2 = sinon.spy();
    var subscriber2a = sinon.spy();
    var subscriber3 = sinon.spy();

    var subscribeMessageListener = sinon.spy();

    before(function () {
      store = new SbStore({messageFormatter: formatter});

      store.on('subscribe', subscribeMessageListener);

      store.subscribe('message1', subscriber1);
      store.subscribe('message2', subscriber2);
      store.subscribe('message2', subscriber2a);
      store.subscribe('message3', subscriber3);

      var receivedMessage = formatter.pack('message2', [6, 7, 'eight']);
      store.receiveMessage(receivedMessage);      
    });

    it('should emit subscribe events', function () {
      subscribeMessageListener.callCount.should.equal(4);
      subscribeMessageListener.calledWith('message1', subscriber1).should.be.true;
      subscribeMessageListener.calledWith('message2', subscriber2).should.be.true;
      subscribeMessageListener.calledWith('message2', subscriber2a).should.be.true;
      subscribeMessageListener.calledWith('message3', subscriber3).should.be.true;
    });

    it('should call all subscribers when message received', function () {
      subscriber2.calledOnce.should.be.true;
      subscriber2a.calledOnce.should.be.true;
    });

    it('should not call subscribers for other messages', function () {
      subscriber1.called.should.be.false;
      subscriber3.called.should.be.false;
    });
  });
});
