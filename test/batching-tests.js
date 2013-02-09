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
  , sinon = require('sinon');

var BatchInterface = require('../lib/batchinterface');

describe('batching layer', function () {
  var clock;

  before(function() {
    clock = sinon.useFakeTimers();
    sinon.stub(BatchInterface.prototype, 'createServiceBusInterface', function () {
      return {
        send: sinon.stub(),
        start: sinon.stub(),
        on: sinon.stub()
      };
    });
  });

  after(function(){
    clock.restore();
    BatchInterface.prototype.createServiceBusInterface.restore();
  });

  describe('creation', function () {
    var batcher;
    before(function () {
      batcher = new BatchInterface('nodeid', null, 'topic', 'subscription');
    });

    it('should create inner service bus interface', function () {
      batcher.createServiceBusInterface.calledOnce.should.be.true;
    });

    it('should pass correct parameters to creation function', function() {
      var createCall = batcher.createServiceBusInterface.getCall(0);
      createCall.args[0].should.equal('nodeid');
      should.not.exist(createCall.args[1]);
      createCall.args[2].should.equal('topic');
      createCall.args[3].should.equal('subscription');
    });
  });

  describe('when sending messages', function () {
    var batcher;

    before(function () {
      batcher = new BatchInterface('nodeid', null, 'topic', 'subscription');
      batcher.start(sinon.spy());
    });

    it('should batch messages that arrive before timeout', function () {
      batcher.send('message1', [1, 2, 3]);
      batcher.send('message2', [4, 5, 6]);
      batcher.send('message3', [7, 8, 9]);

      batcher.pending.length.should.equal(3);
    });

    it('should send batch after timeout', function () {
      clock.tick(251);

      batcher.pending.length.should.equal(0);
    });
  });

  describe('when receiving messages', function () {
    var batcher;
    var batchedMessages = [
      ['message1', [1, 2, 3]],
      ['message1', [3, 4, 5]],
      ['notify', ['this', 'is', 'some', 'text']],
      ['done', []]
    ];

    var receiver = sinon.spy();
    var calls = [];

    before(function() {
      batcher = new BatchInterface('nodeId', null, 'topic', 'subscription');
      batcher.start(receiver);
      batcher.receiveMessage('another-node', 'batch', batchedMessages);

      for(var i = 0; i < receiver.callCount; ++i) {
        calls.push(receiver.getCall(i));
      }
    });

    it('should pass individual messages to receiver', function () {
      receiver.callCount.should.equal(batchedMessages.length);
    });

    it('should pass expected source node id for each message in batch', function () {
      calls.every(function (call) { return call.args[0] === 'another-node'; }).should.be.true;
    });

    it('should pass expected message types', function () {
      calls.forEach(function (call, i) { 
        call.args[1].should.equal(batchedMessages[i][0]);
      });
    });

    it('should pass expected arguments', function () {
      calls.forEach(function (call, i) {
        call.args[2].forEach(function (arg, j) {
          arg.should.equal(batchedMessages[i][1][j]);
        });
      });
    });
  });
});

