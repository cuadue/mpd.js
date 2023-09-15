import * as  net from 'node:net';
import {TypedEmitter} from 'tiny-typed-emitter';

const MPD_SENTINEL = /^(OK|ACK|list_OK) ?(.*)$/m;

export type ConnectOptions = {host: string, port: number};
const defaultConnectOpts: ConnectOptions = {
  host: 'localhost',
  port: 6600
};

export type State = Error | 'connecting' | 'ready';
interface MpdClientEvents {
  ready: () => void;
  state: (state: State) => void;
  system: (name: string) => void;
}

export type MessageHandler = (err?: Error, msg?: any) => any;
export type Command = string | [string, ...string[]];
export type KeyValuePairs = {[key: string]: string};

type MpdResponse = {kind: 'error' | 'version' | 'data', payload: string};

export const parseResponse = (data: string): {responses: Array<MpdResponse>, remain: string} => {
  const responses: Array<MpdResponse> = [];
  const lines = data.split('\n');
  var beginLine = 0;

  for (var i = 0; i < lines.length; i++) {
    const line = lines[i];

    const version = line.match(/^OK MPD (.+)/);
    const error = line.match(/^ACK \[.*] {.*} (.+)/);

    if (version) {
      responses.push({kind: 'version', payload: version[1]});
      beginLine = i + 1;
    } else if (error) {
      responses.push({kind: 'error', payload: error[1]});
      beginLine = i + 1;
    } else if (line === 'OK') {
      responses.push({kind: 'data', payload: lines.slice(beginLine, i).join('\n')});
      beginLine = i + 1;
    }
  }

  return {responses, remain: lines.slice(beginLine).join('\n')};
}

export class MpdClient extends TypedEmitter<MpdClientEvents> {
  private buffer: string = '';
  private msgHandlerQueue: Array<MessageHandler> = [];
  private socket?: net.Socket = null;
  private restartIdle: boolean = true;

  connect(options: ConnectOptions = defaultConnectOpts) {
    this.emit('state', 'connecting');
    this.socket = net.connect(options, () => {
      console.log('MPD client connected to ' + options.host + ':' + options.port);
    });

    this.socket.setEncoding('utf8');
    this.socket.on('data', (data) => this.receive(data));
    this.socket.on('close', () => {
      this.emit('state', new Error('Socket unexpectedly closed'));
      console.log('Reconnecting because socket closed');
      this.connect(options);
    });
    this.socket.on('error', (err) => {
      console.log(`Reconnecting due to error: ${err}`);
      this.emit('state', err);
      this.connect(options);
    });
  }

  private receive(data: Buffer) {
    const {responses, remain} = parseResponse(this.buffer + data);
    this.buffer = remain;

    const dispatch = {
      version: (payload: string) => {
        // The server sends the version upon connection.
        console.log(`MPD Server Version ${payload}`)
        this.emit('ready');
        this.emit('state', 'ready');
        this.idle();
      },
      error: (payload: string) => this.handleMessage(new Error(payload), null),
      data: (payload: string) => this.handleMessage(null, payload),
    };

    responses.forEach(response => dispatch[response.kind](response.payload));
  }

  private handleMessage(err?: Error, msg?: string) {
    var handler = this.msgHandlerQueue.shift();
    handler(err, msg);
  };

  private idle() {
    this.send('idle').then((msg) => {
      msg.split("\n").forEach((line: string) => {
        const m = /changed: (\w+)/.exec(line);
        if (m) {
          this.emit('system', m[1]);
        }
      });
      if (this.restartIdle) {
        this.idle();
      }
    });
  }

  async sendCommand(command: Command): Promise<string> {
    // Write noidle directly to the socket to cause the server to 
    // respond, which will resolve the pending idle request.
    this.restartIdle = false;
    this.socket.write('noidle\n');
    const ret = await this.send(serializeCommand(command));
    this.restartIdle = true;
    this.idle();
    return ret;
  };

  async sendCommands(commandList: Array<Command>) {
    return this.sendCommand(
      ["command_list_begin",
      ...commandList.map(serializeCommand),
      "command_list_end"].join('\n'));
  };

  private async send(data: string): Promise<string> {
    this.socket.write(data.trimEnd() + '\n');
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

  private onEventWithName(event: keyof MpdClientEvents, name: string, handler: () => void) {
    this.on(event, (n: string) => (n === name) && handler());
  }

  onReady(handler: () => void) {
    this.onEventWithName('state', 'ready', handler);
  }

  onSystem(name: string, handler: () => void) {
    this.onEventWithName('system', name, handler);
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
