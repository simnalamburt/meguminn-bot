'use strict';

const IRCBot = require('./bot.js');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.setPrompt("> ");

const bot = new IRCBot(
  "real.uriirc.org", 16664,
  "메구밍", "Meguminn", "Meguminn bot by VBChunguk",
  "Meguminn"
);

bot.loadModule([
  "meguminn.js"
]);
bot.on('message', (nick, to, text, message) => {
}).on('error', (err) => {
  console.error(err);
});

bot.on('connect', () => {
  bot.join('#botworld');
  bot.join('#snucse16');
  bot.join('#upnl');
  rl.prompt();
});

rl.on('line', (line) => {
  let argv = line.trim().split(" ").filter((item) => item.length > 0);
  let argc = argv.length;
  if (argc <= 0) return;
  switch (argv[0]) {
    case "quit":
      bot.disconnect().then(() => {
        console.log("Disconnected.");
        process.exit(0);
      }).catch((err) => {
        console.error(err);
      });
      break;
    case "join":
      if (argc < 2) console.log("Please enter the channel name");
      else {
        bot.join(`${argv[1]}`);
      }
      break;
    case "nick":
      if (argc < 2) console.log("Please enter the new nick");
      else {
        bot.nick(argv[1]);
      }
    case "load":
      if (argc < 2) console.log("Please enter the module file");
      else {
        bot.loadModule(argv[1]);
      }
      break;
    case "reload":
      if (argc < 2) console.log("Please enter the module name");
      else bot.reloadModule(argv[1]);
      break;
    case "enable":
      if (argc < 2) console.log("Please enter the action ID");
      else {
        bot.enableModule(argv[1]);
      }
      break;
    case "disable":
      if (argc < 2) console.log("Please enter the action ID");
      else {
        bot.disableModule(argv[1]);
      }
      break;
  }
}).on('close', () => {
  bot.disconnect().then(() => {
    console.log("Disconnected.");
    process.exit(0);
  }).catch((err) => {
    console.error(err);
  });
});
