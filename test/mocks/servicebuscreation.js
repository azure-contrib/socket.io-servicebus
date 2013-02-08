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

var 
  Formatter = require('../../lib/formatter')
  , SbStore = require('../../lib/sbstore')
  , sinon = require('sinon')
  , util = require('util');

function mockServiceBusCreation() {
  sinon.stub(SbStore.prototype, 'createServiceBusInterface', function (options) {
    return {
      start: sinon.stub(),
      send: sinon.stub(),
      on: sinon.stub()
    };
  });
}

function mockFormatterCreation() {
  var originalPack = Formatter.prototype.pack;
  var originalUnpack = Formatter.prototype.unpack;

  sinon.stub(SbStore.prototype, 'createFormatter', function (nodeId) {
    return {
      nodeId: nodeId,
      pack: sinon.spy(originalPack),
      unpack: sinon.spy(originalUnpack)
    }
  });
}

function undoServiceBusCreationMocks() {
  SbStore.prototype.createServiceBusInterface.restore();
}

function undoFormatterCreationMocks() {
  SbStore.prototype.createFormatter.restore();
}

exports.mockServiceBusCreation = mockServiceBusCreation;
exports.undoServiceBusCreationMocks = undoServiceBusCreationMocks;
exports.mockFormatterCreation = mockFormatterCreation;
exports.undoFormatterCreationMocks = undoFormatterCreationMocks;