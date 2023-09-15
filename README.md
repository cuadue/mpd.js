# node mpd client

Connect to a [music player daemon](http://musicpd.org) server, send commands,
emit events.

You might also be interested in checking out
[node-groove](https://github.com/andrewrk/node-groove),
a generic music player backend as a node module.

Or maybe [Groove Basin](https://github.com/andrewrk/groovebasin),
a music player server which supports the MPD protocol and has many
[features and improvements](http://andrewkelley.me/post/quest-build-ultimate-music-player.html)
over MPD.

## Usage

```ts
import { MpdClient } from "../dist/index.js";

const client = new MpdClient();

client.onSystem('player', async () => {
  const msg = await client.getStatus();
  console.log(msg);
});

client.onSystem('mixer', async () => {
  const msg = await client.getStatus();
  console.log(`Volume changed to ${msg.volume}`);
});

client.on('state', (state) => {
  if (state instanceof Error) {
    console.log(`Something bad happened! ${state}`);
  } else {
    console.log(`State changed to ${state}`);
  }
});

client.connect({
  port: 6600,
  host: 'raspberrypi.local',
});

const msg = await client.getStatus();
console.log(`status: ${JSON.stringify(msg)}`);

client.onReady(async () => {
  console.log("MPD Client is connected");

  while (true) {
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
  }
});
```

## Documentation

See also the [MPD Protocol Documentation](http://www.musicpd.org/doc/protocol/).

Make a new client with `const client = new MpdClient()`.

### Functions

#### client.connect(options)

Connects to the MPD server.

#### async client.sendCommand(command)

`command` can be either:
* a string `commandName` for a command with no arguments, or
* an array `[commandName, arg1, ...]` for a command with arguments

#### async client.sendCommands(commandList)

Send multiple commands in one batch

#### parseKeyValueMessage(msg)

`msg`: a string which contains an MPD response.
Returns an object.

### Events

#### state(arg)

Whenever the state of the client changes. `arg` is
an `Error` instance, the string `connecting` or the string `ready`.

#### system(systemName)

A system has updated. `systemName` is one of:

  * `database` - the song database has been modified after update.
  * `update` - a database update has started or finished. If the database was
    modified during the update, the database event is also emitted.
  * `stored_playlist` - a stored playlist has been modified, renamed, created
    or deleted
  * `playlist` - the current playlist has been modified
  * `player` - the player has been started, stopped or seeked
  * `mixer` - the volume has been changed
  * `output` - an audio output has been enabled or disabled
  * `options` - options like repeat, random, crossfade, replay gain
  * `sticker` - the sticker database has been modified.
  * `subscription` - a client has subscribed or unsubscribed to a channel
  * `message` - a message was received on a channel this client is subscribed
    to; this event is only emitted when the queue is empty

### Event Helper Functions

#### client.onReady(callback)

Callback is called when the client is ready to receive commands. This is called
again after reconnecting, if there was an error previously.

#### client.onSystem(name, callback)

Callback is called with no args when the subsystem having `name` changes.