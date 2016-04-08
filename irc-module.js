'use strict';

const fs = require('fs');
const vm = require('vm');
const bluebird = require('bluebird');

class IrcModuleBase {
  constructor(name, option) {
    this.name = name;
    this.matchOption = option || {
      type: 'custom'
    };
  }

  match(text) {
    let commandString;
    let idx;
    let test = false;
    switch (this.matchOption.type) {
      case "exclamation":
        commandString = `!${this.matchOption.trigger}${this.matchOption.standalone?'':' '}`;
        idx = text.lastIndexOf(commandString);
        test = idx != -1;
        idx += commandString.length;
        break;
      case "literal":
        commandString = this.matchOption.trigger;
        idx = text.lastIndexOf(commandString);
        test = idx != -1;
        idx += commandString.length;
        break;
      case "regexp":
        test = this.matchOption.trigger.exec(text);
        idx = this.matchOption.trigger.lastIndex;
        break;
    }
    let args;
    if (test) {
      args = text.substring(idx);
      if (this.matchOption.splitArgs) {
        args = args.trim().split(' ').filter((item) => item.length > 0);
      }
    }
    return {
      accepted: test,
      args: args
    };
  }

  reply(args, sender) {
  }

  chain(manager, enabled) {
    manager.add(this.name, this, enabled);
  }
};

class ReplySender {
  constructor(irc, channel, nick) {
    this.irc = irc;
    this.channel = channel;
    this.nick = nick;
    this.preserveNext = false;
  }

  send(text) {
    this.irc.send(this.channel, text);
  }

  reply(text) {
    this.irc.send(this.channel, `${this.nick}: ${text}`);
  }
};

class ModuleManager {
  constructor() {
    this.modules = {};
    this.paths = {};
    this.enable_table = {};
    this.chain = [];
  }

  add(name, module, enabled) {
    if (enabled === undefined) enabled = true;
    this.modules[name] = module;
    this.enable_table[name] = enabled;
    this.chain.push(name);
  }
  load(path, enabled) {
    const file = `./irc_modules/${path}`;
    bluebird.promisify(fs.readFile)(file).then((body) => {
      const moduleClass = vm.runInNewContext(body.toString(), {
        ModuleBase: IrcModuleBase,
        console: console,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        process: process,
        require: require,
        require_module: path => {
          return require(`./irc_modules/${path}`);
        },
      }, {
        filename: file
      });
      let moduleInstance = new moduleClass();
      moduleInstance.chain(this, enabled);
      this.paths[moduleInstance.name] = path;
      console.log(`*** Loaded module ${moduleInstance.name}`);
    });
  }
  enable(name) {
    if (this.enable_table[name] === undefined) return;
    this.enable_table[name] = true;
  }
  disable(name) {
    if (this.enable_table[name] === undefined) return;
    this.enable_table[name] = false;
  }
  reload(name) {
    if (this.paths[name] === undefined) return;
    this.load(this.paths[name], this.enable_table[name]);
  }

  processMessage(irc, channel, nick, text) {
    let replySender = new ReplySender(irc, channel, nick);
    for (let name of this.chain) {
      if (this.enable_table[name] === false) continue;
      let matchInfo = this.modules[name].match(text);
      if (matchInfo.accepted) {
        this.modules[name].reply(matchInfo.args, replySender);
        return name;
      }
    }
  }
};

function plugin(manager) {
  return function(irc) {
    irc.moduleManager = manager;
    irc.on('message', (e) => {
      manager.processMessage(irc, e.to, e.from, e.message);
    });
  };
};

module.exports = {
  ModuleBase: IrcModuleBase,
  ReplySender: ReplySender,
  ModuleManager: ModuleManager,
  plugin: plugin
};
