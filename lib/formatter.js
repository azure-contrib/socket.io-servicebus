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

// Formatting from socket.io message arguments into a
// service bus formatted brokered message

module.exports = Formatter;

function Formatter(nodeId) {
  this.nodeId = nodeId;
}

Formatter.prototype.pack = function (name, messageArgs) {
  return {
    body: JSON.stringify(messageArgs),
    brokerProperties: {
      CorrelationId: this.nodeId,
      Label: name
    }
  };
}

Formatter.prototype.unpack = function (message) {
  return {
    name: message.brokerProperties.Label,
    nodeId: message.brokerProperties.CorrelationId,
    args: JSON.parse(message.body)
  };
}

