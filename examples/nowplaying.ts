import { MpdClient } from "../dist/index.js";

const client = new MpdClient();

client.on('system', async (name) => {
  console.log("update", name);
  if (name === 'player') {
    const msg = await client.getStatus();
    console.log(msg);
  }
});

client.connect({
  port: 6600,
  host: 'raspberrypi.local',
});

const main = async () => {
  await new Promise<void>(resolve => client.on('ready', resolve));
  console.log("MPD Client is connected");

  const msg = await client.getStatus();
  console.log(`status: ${msg}`);

  while (true) {
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
  }
}

main()