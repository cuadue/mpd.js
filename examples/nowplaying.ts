import { MpdClient, parseKeyValueMessage } from "../dist/index.js";

const client = new MpdClient();

client.onSystem('player', async () => {
  const msg = await client.getStatus();
  console.log('System "player" event, status is now:', msg);
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


const main = async () => {
  await client.connect({
    port: 6600,
    host: 'raspberrypi.local',
  })

  console.log("MPD Client is connected");

  const playlistinfo = await client.sendCommands([
    'clear',
    ['add', 'https://listen.xray.fm/stream'],
    'play',
    'playlistinfo'
  ]);

  console.log('Playlist file:', parseKeyValueMessage(playlistinfo).file);

  const msg = await client.getStatus();
  console.log('Status', msg);

  while (true) {
    await new Promise<void>(resolve => setTimeout(resolve, 16));
  }
};

main();