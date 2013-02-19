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

var SequencingInterface = require('../lib/sequencinginterface');

var createOptions = {
  nodeId: 'someNode',
  serviceBusInterface: null,
  topic: 'aTopic',
  subscription: 'aSubscription'
};

describe('Message sequencing layer', function () {
  describe('when created', function () {
      var innerInterface;
      var sequencer;

    beforeEach(function () {
      innerInterface = {
        on: sinon.spy(),
        start: sinon.spy()
      };
      sequencer = new SequencingInterface(createOptions, innerInterface);      
    });

    it('should register for message events from inner', function() {
      innerInterface.on.calledWith('message').should.be.true;
    });

    it('should start inner interface when started', function () {
      sequencer.start();
      innerInterface.start.calledOnce.should.be.true;
    });

    it('should only start once if start called multiple times', function () {
      sequencer.start();
      sequencer.start();
      innerInterface.start.calledOnce.should.be.true;
    });

  });

  describe('when sending', function () {
    var innerInterface;
    var sequencer;

    beforeEach(function () {
      innerInterface = {
        on: noop,
        send: sinon.spy()
      };

      sequencer = new SequencingInterface(createOptions, innerInterface);
    });

    it('should pass message to inner', function () {
      sequencer.send('aMessage', [1, 2, 3]);

      innerInterface.send.calledOnce.should.be.true;
      innerInterface.send.calledWithMatch('aMessage', [1, 2, 3]).should.be.true;

    });

    it('should add sequence number and next to first message', function () {
      sequencer.send('firstMessage', [4, 5]);

      innerInterface.send.calledWithMatch('firstMessage', [4, 5], { seq: 0, next: 1 }).should.be.true;
    });
    it('should add increasing sequence numbers to next messages', function () {
      sequencer.send('msg', 'a');
      sequencer.send('msg', 'b');
      sequencer.send('msg', 'c');

      innerInterface.send.callCount.should.equal(3);
      innerInterface.send.calledWithMatch('msg', 'a', {seq: 0}).should.be.true;
      innerInterface.send.calledWithMatch('msg', 'b', {seq: 1}).should.be.true;
      should.not.exist(innerInterface.send.getCall(1).args[2].first);
      innerInterface.send.calledWithMatch('msg', 'c', {seq: 2}).should.be.true;
      should.not.exist(innerInterface.send.getCall(2).args[2].first);
    });

    it('should include next sequence number in message', function () {
      sequencer.send('msg', 'q');
      sequencer.send('msg', 'r');
      sequencer.send('msg', 's');

      var firstCall = innerInterface.send.getCall(0);
      var secondCall = innerInterface.send.getCall(1);
      var thirdCall = innerInterface.send.getCall(2);

      firstCall.args[2].next.should.equal(secondCall.args[2].seq);
      secondCall.args[2].next.should.equal(thirdCall.args[2].seq);
    });
  });

  describe('when receiving in order', function () {
    var innerInterface;
    var sequencer;
    var receiveFunc;
    var receivedMessages;

    beforeEach(function () {
      innerInterface = {
        on: function (msg, callback) {
          receiveFunc = callback;
        },
        send: noop
      };

      sequencer = new SequencingInterface(createOptions, innerInterface);
      receivedMessages = [];
      sequencer.on('message', function (sourceNodeId, msg, args, metadata) {
        receivedMessages.push([sourceNodeId, msg, args, metadata]);
      });
    });

    it('should deliver messages in order', function () {
      var sourceNode = 'node-1';
      receiveFunc(sourceNode, 'msg', [1, 2, 3], {first: 1, seq: 0, next: 1});
      receiveFunc(sourceNode, 'msg', [4, 5, 6], {seq: 1, next: 2});
      receiveFunc(sourceNode, 'msg', [7, 8, 9], {seq: 2, next : 3});

      receivedMessages.should.have.length(3);

      for(var i = 0, len = receivedMessages.length; i < len; i++) {
        receivedMessages[i][3].seq.should.equal(i);
      }
    });
  });

  describe('when receiving from one node out of order', function () {
    var innerInterface;
    var sequencer;
    var send;
    var receivedMessages;

    beforeEach(function () {
      innerInterface = {
        on: function (msg, callback) {
          send = callback;
        },
        start: noop,
        send: noop
      };

      sequencer = new SequencingInterface(createOptions, innerInterface);
      receivedMessages = [];
      sequencer.on('message', function (sourceNodeId, msg, args, metadata) {
        receivedMessages.push([sourceNodeId, msg, args, metadata]);
      });
    });

    it('should deliver after first message', function () {
      send('sourceNode', 'msg', 'hello', { seq: 1, next: 2});
      receivedMessages.should.have.length(1);
    });

    it('should ignore messages older than first message received', function () {
      send('sourceNode', 'msg', 'world', {seq: 1, next: 2});
      send('sourceNode', 'msg', 'hello', {seq: 0, next:1});

      receivedMessages.should.have.length(1);
      receivedMessages[0][2].should.equal('world');
    });

    it('should deliver all messages when missing message is received', function () {
      send('sourceNode', 'msg', 'hello', { seq: 0, next: 1});
      receivedMessages.should.have.length(1);

      send('sourceNode', 'msg', 'from node', { seq: 2, next: 3});
      receivedMessages.should.have.length(1);

      send('sourceNode', 'msg', 'world', { seq: 1, next: 2});

      receivedMessages.should.have.length(3);

      receivedMessages[0][2].should.equal('hello');
      receivedMessages[1][2].should.equal('world');
      receivedMessages[2][2].should.equal('from node');
    });

    it('should deliver next message if received in order', function () {
      send('sourceNode', 'msg', 'hello', { seq: 0, next: 1});
      send('sourceNode', 'msg', 'from node', {seq: 2, next: 3});
      send('sourceNode', 'msg', 'with affection', {seq: 3, next: 4});
      send('sourceNode', 'msg', 'and stuff', {seq: 4, next: 5});
      send('sourceNode', 'msg', 'world', { seq: 1, next: 2});

      receivedMessages.should.have.length(5);
      receivedMessages[0][2].should.equal('hello');
      receivedMessages[1][2].should.equal('world');
      receivedMessages[2][2].should.equal('from node');
      receivedMessages[3][2].should.equal('with affection');
      receivedMessages[4][2].should.equal('and stuff');
    });

    it('should ignore messages older than the next one expected', function () {
      send('sourceNode', 'msg', 'from node', { seq: 2, next: 3});
      send('sourceNode', 'msg', 'Hello', {seq: 0, next: 1});
      send('sourceNode', 'msg', 'with affection', {seq: 3, next: 4});
      send('sourceNode', 'msg', 'World', { seq: 1, next: 2});

      receivedMessages.should.have.length(2);
      receivedMessages[0][2].should.equal('from node');
      receivedMessages[1][2].should.equal('with affection');
    });
  });

  describe('when receiving from multiple nodes out of order', function () {
    var innerInterface;
    var sequencer;
    var send;
    var receivedMessages;

    beforeEach(function () {
      innerInterface = {
        on: function (msg, callback) {
          send = callback;
        },
        start: noop,
        send: noop
      };

      sequencer = new SequencingInterface(createOptions, innerInterface);
      receivedMessages = [];
      sequencer.on('message', function (sourceNodeId, msg, args, metadata) {
        receivedMessages.push([sourceNodeId, msg, args, metadata]);
      });
    });

    it('should deliver multiple in order messages', function () {
      send('n1', 'msg', 'a', { seq: 4, next: 5});
      receivedMessages.should.have.length(1);
      send('n2', 'msg', 'A', { seq: 10, next: 11});
      receivedMessages.should.have.length(2);
      send('n2', 'msg', 'B', { seq: 11, next: 12});
      receivedMessages.should.have.length(3);
      send('n1', 'msg', 'b', {seq: 5, next: 6});
      receivedMessages.should.have.length(4);

      [['n1', 'a'], ['n2', 'A'], ['n2', 'B'], ['n1', 'b']].forEach(function (testData, i) {
        receivedMessages[i][0].should.equal(testData[0]);
        receivedMessages[i][2].should.equal(testData[1]);
      })
    });


    it('should deliver in order from first node and out of order from second node', function () {
      send('n1', 'msg', 'a', { seq: 0, next: 1});
      receivedMessages.should.have.length(1);

      send('n2', 'msg', 'A', { seq: 4, next: 5});
      receivedMessages.should.have.length(2);

      send('n2', 'msg', 'C', { seq: 6, next: 7});
      receivedMessages.should.have.length(2);

      send('n1', 'msg', 'b', { seq: 1, next: 2});
      receivedMessages.should.have.length(3);

      send('n2', 'msg', 'B', { seq: 5, next: 6});
      receivedMessages.should.have.length(5);

      [['n1', 'a'], ['n2', 'A'], ['n1', 'b'], ['n2', 'B'], ['n2', 'C']].forEach(function (testData, i) {
        receivedMessages[i][0].should.equal(testData[0]);
        receivedMessages[i][2].should.equal(testData[1]);
      });
    });

    it('should deliver in order when both nodes are out of order', function () {
      send('n1', 'msg', 'a', { seq: 0, next: 1});
      receivedMessages.should.have.length(1);

      send('n2', 'msg', 'A', { seq: 4, next: 5});
      receivedMessages.should.have.length(2);

      send('n2', 'msg', 'C', { seq: 6, next: 7});
      receivedMessages.should.have.length(2);

      send('n1', 'msg', 'c', { seq: 2, next: 3});
      receivedMessages.should.have.length(2);

      send('n2', 'msg', 'B', { seq: 5, next: 6});
      receivedMessages.should.have.length(4);

      send('n1', 'msg', 'b', { seq: 1, next: 2});
      receivedMessages.should.have.length(6);

      [['n1', 'a'], ['n2', 'A'], ['n2', 'B'], ['n2', 'C'], ['n1', 'b'], ['n1', 'c']].forEach(function (testData, i) {
        receivedMessages[i][0].should.equal(testData[0]);
        receivedMessages[i][2].should.equal(testData[1]);
      });

    });
  });

  describe('when stopping', function () {
    var innerInterface;
    var sequencer;

    beforeEach(function () {
      innerInterface = {
          on: noop,
          start: sinon.spy(),
          stop: sinon.spy(),
        };

      sequencer = new SequencingInterface(createOptions, innerInterface);
    });

    it('should stop inner', function () {
      sequencer.start();

      sequencer.stop();

      innerInterface.stop.calledOnce.should.be.true;
    });

    it('should restart after stopping', function () {
      sequencer.start();
      sequencer.stop();
      sequencer.start();
      innerInterface.start.callCount.should.equal(2);
    });

    it('should only stop inner when started', function () {
      sequencer.stop();

      innerInterface.stop.calledOnce.should.be.false;
    });

    it('should not stop inner again if stopped again', function () {
      sequencer.start();
      sequencer.stop();
      sequencer.stop();

      innerInterface.stop.calledOnce.should.be.true;
    });
  });
});

function noop() { }
