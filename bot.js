'use strict';

const tls = require('tls');
const qb = require('slate-irc');
const Module = require('./irc-module.js');
const EventEmitter = require('events');

class IRCBot extends EventEmitter {
  constructor(host, port, nick, username, realname, processname) {
    super();
    if (processname == null) process.title = processname;
    this.opt = {
      host: host,
      port: port,
      rejectUnauthorized: false,
    };
    this.defaultNick = nick;
    this.username = username;
    this.realname = realname;
    this.manager = new Module.ModuleManager();
    this.isQuit = false;
    this.connect();
  }

  join(channel) {
    this.client.join(channel);
  }
  connect() {
    this.socket = tls.connect(this.opt, () => {
      this.client = qb(this.socket);
      this.client.use(Module.plugin(this.manager));
      this.client.on('message', (nick, to, text, message) => {
        this.emit('message', nick, to, text, message);
      }).on('errors', (err) => {
        this.emit('error', err);
      }).on('disconnect', () => {
        this.emit('disconnect');
        // Reconnect if not explicitly disconnected
        if (!this.isQuit) {
          console.log('*** Disconnected, retry...');
          this.connect();
        }
      });

      console.log('*** Client connected to server');
      this.client.nick(this.defaultNick);
      this.client.user(this.username, this.realname);
      this.emit('connect');
    });
    this.socket.on('error', e => {
      console.error(e.stack);
      console.log('*** Error occured, retry...');
      this.connect();
    });
  }
  disconnect(message) {
    this.isQuit = true;
    return new Promise(resolve => {
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
