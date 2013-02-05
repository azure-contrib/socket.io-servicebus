# socket.io-servicebus - socket.io store using Windows Azure Service Bus

This project provides a Node.js package that lets you use Windows Azure Service Bus as a back-end communications
channel for socket.io applications.

# Library Features

* Service Bus Store
    * Easily connect multiple socket.io server instances over Service Bus
    * 

# Getting Started
## Download Source Code

To get the source code of the SDK via **git** just type:

    git clone https://github.com/WindowsAzure/socket.io-servicebus
    cd ./socket.io-servicebus

## Install the npm package

You can install the azure npm package directly.

    npm install socket.io-servicebus

# Usage

First, set up your Service Bus namespace. Create a topic to use for communications, and one subscription per socket.io server instance.
These can be created either via the Windows Azure portal or programmatically using the Windows Azure SDK for Node.

Then, configure socket.io to use the Service Bus Store:

```Javascript
var sio = require('socket.io');
var SbStore = require('socket.io-servicebus');

var io = sio.listen(server);
io.configure(function () {
  io.set('store', new SbStore({
    topic: topicName,
    subscription: subscriptionName,
    connectionString: connectionString
  }));
});
```

The connection string can either be retrieved from the portal, or using our powershell / x-plat CLI tools. From here, communications to and from the server will get routed over Service Bus.

## Current Issues

The current version (0.0.1) only routes messages; client connection state is stored in memory in the server instance. Clients need to consistently connect to the same server instance to avoid losing their session state.

# Need Help?

Be sure to check out the Windows Azure [Developer Forums on Stack Overflow](http://go.microsoft.com/fwlink/?LinkId=234489) if you have trouble with the provided code.

# Contribute Code or Provide Feedback

If you would like to become an active contributor to this project please follow the instructions provided in [Windows Azure Projects Contribution Guidelines](http://windowsazure.github.com/guidelines.html).

If you encounter any bugs with the library please file an issue in the [Issues](https://github.com/WindowsAzure/socket.io-servicebus/issues) section of the project.

# Learn More

For documentation on how to host Node.js applications on Windows Azure, please see the [Windows Azure Node.js Developer Center](http://www.windowsazure.com/en-us/develop/nodejs/).

For documentation on the Azure cross platform CLI tool for Mac and Linux, please see our readme [here] (http://github.com/windowsazure/azure-sdk-tools-xplat)

Check out our new IRC channel on freenode, node-azure.
