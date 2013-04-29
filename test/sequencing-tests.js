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

var MessageSequencer = require('../lib/messagesequencer');

var createOptions = {
  nodeId: 'someNode',
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
        start: sinon.stub().callsArgAsync(0)
      };
      sequencer = new MessageSequencer(createOptions, innerInterface);      
    });

    it('should register for message events from inner', function() {
      innerInterface.on.calledWith('message').should.be.true;
      innerInterface.on.calledWith('badmessage').should.be.true;
    });

    it('should start inner interface when started', function () {
      sequencer.start();
      innerInterface.start.calledOnce.should.be.true;
    });

    it('should only start once if start called multiple times', function (done) {
      sequencer.start(function () {
        sequencer.start(function () {
          innerInterface.start.calledOnce.should.be.true;
          done();
        });
      });
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

      sequencer = new MessageSequencer(createOptions, innerInterface);
    });

    it('should pass message to inner', function () {
      sequencer.send('aMessage', [1, 2, 3]);

      innerInterface.send.calledOnce.should.be.true;
      innerInterface.send.calledWithMatch('aMessage', [1, 2, 3]).should.be.true;

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
          if (msg === 'message') {
            receiveFunc = callback;
          }
        },
        send: noop
      };

      sequencer = new MessageSequencer(createOptions, innerInterface);
      receivedMessages = [];
      sequencer.on('message', function (sourceNodeId, msg, args, metadata) {
        receivedMessages.push([sourceNodeId, msg, args, metadata]);
      });
    });

    it('should deliver messages in order', function () {
      var sourceNode = 'node-1';
      receiveFunc(sourceNode, 'msg', [1, 2, 3], 0);
      receiveFunc(sourceNode, 'msg', [4, 5, 6], 1);
      receiveFunc(sourceNode, 'msg', [7, 8, 9], 2);

      receivedMessages.should.have.length(3);

      for(var i = 0, len = receivedMessages.length; i < len; i++) {
        receivedMessages[i][3].should.equal(i);
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
          if (msg === 'message') {
            send = callback;
          }
        },
        start: noop,
        send: noop
      };

      sequencer = new MessageSequencer(createOptions, innerInterface);
      receivedMessages = [];
      sequencer.on('message', function (sourceNodeId, msg, args, metadata) {
        receivedMessages.push([sourceNodeId, msg, args, metadata]);
      });
    });

    it('should deliver after first message', function () {
      send('sourceNode', 'msg', 'hello', 1);
      receivedMessages.should.have.length(1);
    });

    it('should ignore messages older than first message received', function () {
      send('sourceNode', 'msg', 'world', 1);
      send('sourceNode', 'msg', 'hello', 0);

      receivedMessages.should.have.length(1);
      receivedMessages[0][2].should.equal('world');
    });

    it('should deliver all messages when missing message is received', function () {
      send('sourceNode', 'msg', 'hello', 0);
      receivedMessages.should.have.length(1);

      send('sourceNode', 'msg', 'from node', 2);
      receivedMessages.should.have.length(1);

      send('sourceNode', 'msg', 'world', 1);

      receivedMessages.should.have.length(3);

      receivedMessages[0][2].should.equal('hello');
      receivedMessages[1][2].should.equal('world');
      receivedMessages[2][2].should.equal('from node');
    });

    it('should deliver next message if received in order', function () {
      send('sourceNode', 'msg', 'hello', 0);
      send('sourceNode', 'msg', 'from node', 2);
      send('sourceNode', 'msg', 'with affection', 3);
      send('sourceNode', 'msg', 'and stuff', 4);
      send('sourceNode', 'msg', 'world', 1);

      receivedMessages.should.have.length(5);
      receivedMessages[0][2].should.equal('hello');
      receivedMessages[1][2].should.equal('world');
      receivedMessages[2][2].should.equal('from node');
      receivedMessages[3][2].should.equal('with affection');
      receivedMessages[4][2].should.equal('and stuff');
    });

    it('should ignore messages older than the next one expected', function () {
      send('sourceNode', 'msg', 'from node', 2);
      send('sourceNode', 'msg', 'Hello', 0);
      send('sourceNode', 'msg', 'with affection', 3);
      send('sourceNode', 'msg', 'World', 1);

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
          if (msg === 'message') {
            send = callback;
          }
        },
        start: noop,
        send: noop
      };

      sequencer = new MessageSequencer(createOptions, innerInterface);
      receivedMessages = [];
      sequencer.on('message', function (sourceNodeId, msg, args, metadata) {
        receivedMessages.push([sourceNodeId, msg, args, metadata]);
      });
    });

    it('should deliver multiple in order messages', function () {
      send('n1', 'msg', 'a', 4);
      receivedMessages.should.have.length(1);
      send('n2', 'msg', 'A', 6);
      receivedMessages.should.have.length(1);
      send('n2', 'msg', 'B', 7);
      receivedMessages.should.have.length(1);
      send('n1', 'msg', 'b', 5);
      receivedMessages.should.have.length(4);

      [['n1', 'a'], ['n1', 'b'], ['n2', 'A'], ['n2', 'B']].forEach(function (testData, i) {
        receivedMessages[i][0].should.equal(testData[0]);
        receivedMessages[i][2].should.equal(testData[1]);
      })
    });


    it('should deliver in order from all nodes', function () {
      send('n1', 'msg', 'a', 0);
      receivedMessages.should.have.length(1);

      send('n2', 'msg', 'A', 2);
      receivedMessages.should.have.length(1);

      send('n1', 'msg', 'b', 1);
      receivedMessages.should.have.length(3);

      send('n2', 'msg', 'C', 4);
      receivedMessages.should.have.length(3);

      send('n2', 'msg', 'B', 3);
      receivedMessages.should.have.length(5);

      [['n1', 'a'], ['n1', 'b'], ['n2', 'A'], ['n2', 'B'], ['n2', 'C']].forEach(function (testData, i) {
        receivedMessages[i][0].should.equal(testData[0]);
        receivedMessages[i][2].should.equal(testData[1]);
      });
    });

    it('should deliver in order when both nodes are out of order', function () {
      send('n1', 'msg', 'a', 0);
      receivedMessages.should.have.length(1);

      send('n2', 'msg', 'A', 3);
      receivedMessages.should.have.length(1);

      send('n2', 'msg', 'C', 5);
      receivedMessages.should.have.length(1);

      send('n1', 'msg', 'c', 2);
      receivedMessages.should.have.length(1);

      send('n2', 'msg', 'B', 4);
      receivedMessages.should.have.length(1);

      send('n1', 'msg', 'b', 1);
      receivedMessages.should.have.length(6);

      [['n1', 'a'], ['n1', 'b'], ['n1', 'c'], ['n2', 'A'], ['n2', 'B'], ['n2', 'C']].forEach(function (testData, i) {
        receivedMessages[i][0].should.equal(testData[0]);
        receivedMessages[i][2].should.equal(testData[1]);
      });

    });
  });

  describe('when receiving a bad message', function () {
    var innerInterface;
    var sequencer;
    var sendMessage;
    var sendBadMessage;
    var receivedMessages;
    var badMessages;
    beforeEach(function () {
      innerInterface = {
        on: function (msg, callback) {
          if (msg === 'message') {
            sendMessage = callback;
          }
          if (msg === 'badmessage') {
            sendBadMessage = callback;
          }
        },
        start: noop,
        send: noop
      };

      sequencer = new MessageSequencer(createOptions, innerInterface);
      receivedMessages = [];
      sequencer.on('message', function (sourceNodeId, msg, args, seq) {
        receivedMessages.push([sourceNodeId, msg, args, seq]);
      });
    });

    it('should drop skip bad messages', function () {
      sendBadMessage('n1', 'badMessage', 1);
      sendBadMessage('n2', 'badMessage', 2);

      receivedMessages.should.have.length(0);
    });

    it('should ignore bad message in middle of good messages', function () {
      sendMessage('n1', 'goodMessage', 'Hello', 0);
      sendBadMessage('n1', 'badMessage', 1);
      sendMessage('n1', 'goodMessage', 'world', 2);

      receivedMessages.should.have.length(2);
      [['n1', 'Hello', 0], ['n1', 'world', 2]].forEach(function (testData, i) {
        receivedMessages[i][0].should.equal(testData[0]);
        receivedMessages[i][2].should.equal(testData[1]);
        receivedMessages[i][3].should.equal(testData[2]);
      });
    });

    it('should ignore bad message in out of sequence messages', function () {
      sendMessage('n1', 'msg', '0', 0);
      sendMessage('n1', 'msg', '4', 4);
      sendBadMessage('n1', 'msg', 1);
      sendMessage('n1', 'msg', '2', 2);
      sendBadMessage('n1', 'msg', 3);

      receivedMessages.should.have.length(3);
      [['n1', '0', 0], ['n1', '2', 2], ['n1', '4', 4]].forEach(function (testData, i) {
        receivedMessages[i][0].should.equal(testData[0]);
        receivedMessages[i][2].should.equal(testData[1]);
        receivedMessages[i][3].should.equal(testData[2]);
      });
    });
  });

  describe('when stopping', function () {
    var innerInterface;
    var sequencer;

    beforeEach(function () {
      innerInterface = {
        on: noop,
        start: sinon.stub().callsArgAsync(0),
        stop: sinon.spy(),
      };

      sequencer = new MessageSequencer(createOptions, innerInterface);
    });

    it('should stop inner', function (done) {
      sequencer.start(function () {
        sequencer.stop();
        innerInterface.stop.calledOnce.should.be.true;
        done();
      });
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

    it('should not stop inner again if stopped again', function (done) {
      sequencer.start(function () {
        sequencer.stop();
        sequencer.stop();

        innerInterface.stop.calledOnce.should.be.true;
        done();
      });
    });

    it('should pass callback to inner to invoke', function (done) {
      sequencer.start(function () {
        function stopCallback() { }
        sequencer.stop(stopCallback);

        innerInterface.stop.firstCall.args[0].should.equal(stopCallback);
        done();
      });
    });
  });
});

function noop() { }
