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

// Helper function for nicknames structure

function Nicknames(localKey) {
  this.localKey = localKey;
  this.nicknames = {};
}

Nicknames.prototype._getLocalNames = function() {
  this.nicknames[this.localKey] = this.nicknames[this.localKey] || {};
  return this.nicknames[this.localKey];
}

Nicknames.prototype.hasLocalName(name) {
  return this._getLocalNames()[name];
}

Nicknames.prototype.addLocalName(name) {
  this._getLocalNames()[name] = name;
}

Nicknames.prototype.setRemoteNames(nodeId, names) {
  var names = {};
  names.forEach(function (n) { names[n] = n; });
  this.nicknames[nodeId] = names;
}

Nicknames.prototype.getLocalNames() {
  return Object.keys(this._getLocalNames());
}

module.exports = Nicknames;
