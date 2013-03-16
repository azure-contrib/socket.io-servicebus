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

  beforeEach(function () {
    serviceBusService = {
      receiveSubscriptionMessage: sinon.spy(),
      sendTopicMessage: sinon.spy(),
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
      logger: logger
    });
  });

  it('should log subscription info on startup', function () {
    logger.info.calledWith('Service Bus Store created', 
      'host:' + serviceBusService.host,
      'topic:testtopic', 
      'sub:testsubscription').should.be.true;
  });
});
