'use strict';

const tls = require('tls');
const slate = require('slate-irc');
const Module = require('./irc-module.js');
const EventEmitter = require('events');

class IRCBot extends EventEmitter {
  constructor(host, port, nick, username, realname) {
    super();
    const opt = {
      host: host,
      port: port,
      rejectUnauthorized: false,
    };
    this.manager = new Module.ModuleManager();
    this.socket = tls.connect(opt, () => {
      console.log('*** Client connected to server');
      this.client = slate(this.socket);
      this.client.use(Module.plugin(this.manager));
      this.client.on('message', (nick, to, text, message) => {
        this.emit('message', nick, to, text, message);
      }).on('errors', (err) => {
        this.emit('error', err);
      });

      this.client.nick(nick);
      this.client.user(username, realname);
      this.emit('connect');
    });
  }

  join(channel) {
    this.client.join(channel);
  }
  disconnect(message) {
    return new Promise((resolve, reject) => {
      this.socket.on('end', () => {
        resolve();
      });
      this.client.quit(message);
    });
  }
  nick(nick) {
    this.client.nick(nick);
  }
  loadModule(moduleFile) {
    let loadSingle = (moduleFile) => {
      this.manager.load(moduleFile);
    };
    if (Array.isArray(moduleFile))
      for (let m of moduleFile) loadSingle(m);
    else
      loadSingle(moduleFile);
  }
  reloadModule(moduleName) {
    this.manager.reload(moduleName);
  }
  enableModule(moduleName) {
    this.manager.enable(moduleName);
  }
  disableModule(moduleName) {
    this.manager.disable(moduleName);
  }
};

module.exports = IRCBot;
