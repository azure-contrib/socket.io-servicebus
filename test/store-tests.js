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

var io = require('socket.io')
  , SbStore = require('../lib/sbstore.js');

describe("Service Bus Store objects", function() {
  
  it("should be createable", function() {
    var store = new SbStore();
    should.exist(store);
  });

  describe('when publishing', function () {

    var formatter = {
      pack: sinon.stub().returns('{type: "message", args: []}'),
      unpack: sinon.stub().returns({type: "message", args: []})
    };

    var serviceBusMock = {
      send: sinon.stub()
    };

    var store;
    var eventsEmitted = [];

    before(function () {
      store = new SbStore({
        serviceBusInterface: serviceBusMock,
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
      serviceBusMock.send.calledOnce.should.be.true;
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
});
