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

var should = require('should');

var io = require('socket.io')
  , SbStore = require('../lib/sbstore.js');

describe("Service Bus Store client objects", function() {
  var store;
  var client;
  var clientId = 'a client';

  before(function() {
    store = new SbStore();
    client = new SbStore.Client(store, clientId);
  });

  it('should inherit from socket.io.Store.Client', function() {
    client.should.be.an.instanceof(io.Store.Client);
  });

  it('should initialize base class fields', function(){
    client.store.should.equal(store);
    client.id.should.equal("a client");
  });
});
