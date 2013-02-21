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

describe("Service Bus Store client objects", function() {
  var store;
  var client;
  var clientId = 'a client';
  var sandbox;

  before(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(SbStore.prototype, 'createServiceBusConnector', function (options) {
      return {
        start: sandbox.stub(),
        send: sandbox.stub(),
        on: sandbox.stub()
      }
    });
  });

  after(function () {
    sandbox.restore();
  });

  beforeEach(function() {
    store = new SbStore({ });
    client = new SbStore.Client(store, clientId);
  });

  it('should inherit from socket.io.Store.Client', function() {
    client.should.be.an.instanceof(io.Store.Client);
  });

  it('should initialize base class fields', function(){
    client.store.should.equal(store);
    client.id.should.equal("a client");
  });

  describe('get and set', function () {
    it('should not return property that has not been set', function (done) {
      client.get('no such key', function (err, value) {
        should.equal(value, null);
        done();
      });
    });

    it('should return value for key that has been set', function (done) {
      var key = 'a key';
      var originalValue = 'a stored value';

      client.set(key, originalValue, function (err) {
        client.get(key, function (err, value) {
          value.should.equal(originalValue);
          done(err);
        });
      });
    });
  });

  describe('has', function () {
    it('should return false if key does not exist', function (done) {
      client.has('no such key', function (err, keyExists) {
        keyExists.should.be.false;
        done(err);
      });
    });

    it('should return true if key does exist', function (done) {
      var key = 'some key';
      var originalValue = 'some value';

      client.set(key, originalValue, function (err) {
        if (err) { return done(err); }
        client.has(key, function (err, hasKey) {
          hasKey.should.be.true;
          done(err);
        });
      });
    });
  });
  it('should delete keys', function (done) {
    var key = 'some key';
    var value ='some value';

    client.set(key, value, function (err) {
      if (err) { return done(err); }
      client.del(key, function (err) {
        if (err) { done(err); }
        client.has(key, function (err, hasKey) {
          if (err) { done(err); }
          hasKey.should.be.false;
          done();
        });
      });
    });
  });

  describe('destroy', function () {
    var key = 'some key';
    var value = 'some value';
    var clock;

    before(function () {
      clock = sinon.useFakeTimers();
    });

    after(function(){
      clock.restore();
    });

    beforeEach(function (done) {
      client.set(key, value, function () {
        done();
      });
    });

    it('should clean up data immediately if no expiration', function (done) {
      client.destroy();
      client.has(key, function (err, hasKey) {
        if (err) { return done(err); }
        hasKey.should.be.false;
        done();
      });
    });

    it('should clean up after expiration', function (done) {
      client.destroy(1);
      client.has(key, function (err, hasKey) {
        if (err) { return done(err); }
        hasKey.should.be.true;

        clock.tick(1000);

        client.has(key, function (err, hasKey) {
          if (err) { return done(err); }
          hasKey.should.be.false;
          done();
        });
      });
    });
  });
});
