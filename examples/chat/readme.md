# socket.io chat, with Azure Service Bus

This example is a slightly-tweaked version of the canonical socket.io chat application.
It has been updated to use Express version 3 and the socket.io-servicebus library
as a back-end store to allow chat to work across multiple servers.

# Running the app

## Set up Service Bus

To run an instance of the chat app, you have to set up a service bus namespace and topic
first.

1. Create (or locate) a Service Bus namespace to use. Get the connection string for this namespace
   either from the Windows Azure portal or by using the azure command line tools.

## Running the application

Before you run, you'll need to run `npm install` in the chat example's directory to set up dependencies.

### Command line parameters

Once you have Service Bus set up, run the application. The command line looks like:

```
  node app.js <topic> <port> <connectionString>
```

`<topic>` is the topic name, `<port>` is the port number to run on, and `<connectionString>` is the service bus connection string.

If `<topic>` does not exist in the Service Bus namespace, it will be automatically created at startup.

### Environment variables

The app will read missing command line values from environment variables (particularly useful if deploying
to Windows Azure):

<table>
    <thead>
        <tr>
            <th>Variable Name</th>
            <th>Usage</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>SB_CONN</td>
            <td>Service bus connection string</td>
        </tr>
        <tr>
            <td>PORT</td>
            <td>Port number</td>
        </tr>
        <tr>
            <td>SB_CHAT_TOPIC</td>
            <td>Topic name</td>
        </tr>
        <tr>
            <td>TEST_SB_CHAT</td>
            <td>For local tests; uses socket.io-servicebus module from source tree rather than npm</td>
        </tr>
    </tbody>
</table>

The `TEST_SB_CHAT` environment variable is not represented on the command line. If you're making changes to the socket.io-servicebus
module itself, turning this environment variable on (set it to any value, it just has to exist) will cause the chat app to
require the module from the source tree directly, rather than using the one npm installed locally.

# Known Issues

* The "presence" messages (list of who has joined the chat) is not currently working correctly across multiple nodes. This
  is a known issue with the chat app itself; you see similar issues when using the redis store.

# Places to look

The most important part of this code is in app.js file. Look for the call to io.configure. This call is where we set up Service Bus as the
store.

# Need Help?

Be sure to check out the Windows Azure [Developer Forums on Stack Overflow](http://go.microsoft.com/fwlink/?LinkId=234489) if you have trouble with the provided code.

# Contribute Code or Provide Feedback

If you would like to become an active contributor to this project please follow the instructions provided in [Windows Azure Projects Contribution Guidelines](http://windowsazure.github.com/guidelines.html).

If you encounter any bugs with the library please file an issue in the [Issues](https://github.com/WindowsAzure/socket.io-servicebus/issues) section of the project.

# Learn More

For documentation on how to host Node.js applications on Windows Azure, please see the [Windows Azure Node.js Developer Center](http://www.windowsazure.com/en-us/develop/nodejs/).

For documentation on the Azure cross platform CLI tool for Mac and Linux, please see our readme [here] (http://github.com/windowsazure/azure-sdk-tools-xplat)
