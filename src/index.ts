import {strict as assert} from 'assert';
import * as  net from 'node:net';
import {TypedEmitter} from 'tiny-typed-emitter';

const MPD_SENTINEL = /^(OK|ACK|list_OK)(.*)$/m;

export type ConnectOptions = {host: string, port: number};
const defaultConnectOpts: ConnectOptions = {
  host: 'localhost',
  port: 6600
};

interface MpdClientEvents {
  connect: () => void;
  ready: () => void;
  end: () => void;
  system: (name: string) => void;
  error: (err: Error) => void;
}

export type MessageHandler = (err?: Error, msg?: any) => any
export type Command = string | [string, ...string[]];
export type KeyValuePairs = {[key: string]: string};

export class MpdClient extends TypedEmitter<MpdClientEvents> {
  private buffer: string = '';
  private msgHandlerQueue: Array<MessageHandler> = [];
  private idling: Boolean = false;
  private socket?: net.Socket = null;

  connect(options: ConnectOptions = defaultConnectOpts) {
    this.socket = net.connect(options, () => {
      console.log('MPD client ready and connected to ' + options.host + ':' + options.port);
      this.emit('connect')
    });

    this.socket.setEncoding('utf8');
    this.socket.on('data', (data) => this.receive(data));
    this.socket.on('close', () => this.emit('end'));
    this.socket.on('error', (err) => this.emit('error', err));
  }

  private receive(data: Buffer) {
    var m: RegExpMatchArray;
    this.buffer += data;
    while (m = this.buffer.match(MPD_SENTINEL)) {
      const msg = this.buffer.substring(0, m.index)
        , line = m[0]
        , code = m[1]
        , str = m[2]
      if (code === "ACK") {
        var err = new Error(str);
        this.handleMessage(err);
      } else if (code === 'OK' && str.startsWith('MPD')) {
        // When the client connects to the server, the server will answer with
        // the following line: OK MPD version
        this.setupIdling();
      } else if (this.idling) {
        this.handleIdleResults(msg);
      } else {
        this.handleMessage(null, msg);
      }

      this.buffer = this.buffer.substring(msg.length + line.length + 1);
    }
  };

  private handleMessage(err?: Error, msg?: string) {
    var handler = this.msgHandlerQueue.shift();
    assert.notEqual(handler, null);
    handler(err, msg);
  };

  private setupIdling() {
    assert.ok(!this.idling);
    this.send("idle");
    this.idling = true;
    this.emit('ready');
  }

  async sendCommand(command: Command): Promise<string> {
    assert.ok(this.idling);
    this.send("noidle\n");
    const ret = await this.send(serializeCommand(command));
    this.setupIdling();
    return ret;
  };

  async sendCommands(commandList: Array<Command>) {
    return this.sendCommand(
      ["command_list_begin",
      ...commandList.map(serializeCommand),
      "command_list_end"].join('\n'));
  };

  private handleIdleResults(msg: string) {
    msg.split("\n").forEach(function(line: string) {
      const m = /changed: (\w+)/.exec(line);
      if (m) {
        this.emit('system', m[1]);
      }
    });
  };

  private async send(data: string): Promise<string> {
    this.socket.write(data + '\n');
    return new Promise((resolve, reject) => {
      this.msgHandlerQueue.push((err?: Error, msg?: string) => {
        if (err != null) reject(err);
        resolve(msg);
      });
    });
  };

  async getStatus(): Promise<KeyValuePairs> {
    const msg = await this.sendCommand('status');
    return parseKeyValueMessage(msg);
  }
}

function argEscape(arg){
  // replace all " with \"
  return '"' + arg.toString().replace(/"/g, '\\"') + '"';
}


function serializeCommand(command: Command): string {
  if (Array.isArray(command)) {
    const [name, ...args] = command;
    return [name, args.map(argEscape).join(" ")].join(' ');
  }
  return command;
}

export function parseKeyValueMessage(msg: string): KeyValuePairs {
  var result = {};

  msg.split('\n').forEach(function(p){
    if(p.length === 0) {
      return;
    }
    var keyValue = p.match(/([^ ]+): (.*)/);
    if (keyValue == null) {
      throw new Error('Could not parse entry "' + p + '"')
    }
    result[keyValue[1]] = keyValue[2];
  });
  return result;
}

export function parseArrayMessage(msg: string): Array<KeyValuePairs> {
  var results = [];
  var obj = {};

  msg.split('\n').forEach(function(p) {
    if(p.length === 0) {
      return;
    }
    var keyValue = p.match(/([^ ]+): (.*)/);
    if (keyValue == null) {
      throw new Error('Could not parse entry "' + p + '"')
    }

    if (obj[keyValue[1]] !== undefined) {
      results.push(obj);
      obj = {};
      obj[keyValue[1]] = keyValue[2];
    }
    else {
      obj[keyValue[1]] = keyValue[2];
    }
  });
  results.push(obj);
  return results;
}
