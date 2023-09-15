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

client.getStatus().then((msg) => {
  console.log(`status: ${JSON.stringify(msg)}`);
});

client.onReady(async () => {
  console.log("MPD Client is connected");

  while (true) {
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
  }
});