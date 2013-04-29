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

var should = require('should')
  , sinon = require('sinon')
  , util = require('util');

var io = require('socket.io')
  , SbStore = require('../lib/sbstore');

describe('Service Bus Store objects', function() {
  var sandbox;
  var startupErr;

  before(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(SbStore.prototype, 'createServiceBusConnector', function (options) {
      return {
        start: sandbox.stub().callsArgWithAsync(0, startupErr),
        send: sandbox.stub(),
        on: sandbox.stub()
      }
    });
  });

  after(function () {
    sandbox.restore();
  });

  describe('when creating', function () {
    var store;
    var startCallback = sinon.spy();
    before(function (done) {
      store = new SbStore();
      store.on('started', function (err) {
        startCallback(err);
        done();
      });
    });

    it('should start the service bus polling', function () {
      store.sb.start.called.should.be.true;
    });

    it('should invoke the start callback', function () {
      startCallback.calledOnce.should.be.true;
      should.not.exist(startCallback.firstCall.args[0]);
    });
  });

  describe('when creating and there is a startup error', function () {
    var store;
    var startCallback = sinon.spy();
    var errCode = '500';
    var errDetail = 'Internal Server Error';

    beforeEach(function (done) {
      startupErr = new Error('Error: 500 - Internal Server Error');
      startupErr.code = errCode;
      startupErr.detail = errDetail;

      store = new SbStore();
      store.on('started', function (err) {
        startCallback(err);
        done();
      });
    });

    afterEach(function () {
      startupErr = undefined;
    });

    it('should emit the started event', function () {
      startCallback.calledOnce.should.be.true;
    });

    it('should pass error info to the event', function () {
      startCallback.firstCall.args[0].should.exist;
      startCallback.firstCall.args[0].code.should.equal(errCode);
      startCallback.firstCall.args[0].detail.should.equal(errDetail);
    });
  });

  describe('when publishing', function () {
    var store;
    var eventsEmitted = [];

    before(function () {
      store = new SbStore({ nodeId: 'my-node-id' });

      store.on('publish', function (name) {
        var args = Array.prototype.slice.call(arguments, 1);
        eventsEmitted.push({event: 'publish', name: name, args: args });
        });
      store.publish('message', 1, 2, 3);
    });

    it('should send message to servicebus topic', function () {
      store.sb.send.calledOnce.should.be.true;
      var call = store.sb.send.getCall(0);
      call.args[0].should.equal('message');
      call.args[1].should.have.length(3);
      call.args[1][0].should.equal(1);
      call.args[1][1].should.equal(2);
      call.args[1][2].should.equal(3);
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
    var store;

    var subscriber1 = sinon.spy();
    var subscriber2 = sinon.spy();
    var subscriber2a = sinon.spy();
    var subscriber3 = sinon.spy();

    var listeners = {
      onreceived: sinon.spy(),
      onsubscribe: sinon.spy(),
      onunsubscribe: sinon.spy()
    };

    before(function () {
      store = new SbStore();
      store.on('subscribe', listeners.onsubscribe);
      store.on('received', listeners.onreceived);
      store.on('unsubscribe', listeners.onunsubscribe);

      store.subscribe('message1', subscriber1);
      store.subscribe('message2', subscriber2);
      store.subscribe('message2', subscriber2a);
      store.subscribe('message3', subscriber3);

      store.receiveMessage('some-other-node', 'message2', [6, 7, 'eight']);
    });

    it('should emit subscribe events', function () {
      listeners.onsubscribe.callCount.should.equal(4);
      listeners.onsubscribe.calledWith('message1', subscriber1).should.be.true;
      listeners.onsubscribe.calledWith('message2', subscriber2).should.be.true;
      listeners.onsubscribe.calledWith('message2', subscriber2a).should.be.true;
      listeners.onsubscribe.calledWith('message3', subscriber3).should.be.true;
    });

    it('should call all subscribers when message received', function () {
      subscriber2.calledOnce.should.be.true;
      subscriber2a.calledOnce.should.be.true;
    });

    it('should not call subscribers for other messages', function () {
      subscriber1.called.should.be.false;
      subscriber3.called.should.be.false;
    });

    it('should emit received event when message received', function () {
      listeners.onreceived.calledOnce.should.be.true;
    });

    it('should not call subscribers for messages from itself', function () {
      store.receiveMessage(store.nodeId, 'message3', ['a message']);

      subscriber3.called.should.be.false;
    });
  });
});
