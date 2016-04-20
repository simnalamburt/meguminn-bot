'use strict';

const crypto = require('crypto');
const bluebird = require('bluebird');
const fs = require('fs');

const randomBytesAsync = bluebird.promisify(crypto.randomBytes);

class Meguminn extends ModuleBase {
  constructor() {
    super('meguminn', {
      type: 'custom',
    });
    this.onExplosionTable = {};
    this.lastCallTable = {
      meguminn: 0,
      explosion: 0
    };
    this.introduction = [
      '내 이름은 메구밍! 아크 위저드를 생업으로 삼고 있으며, 최강의 공격마법, 폭렬마법을 펼치는 자!',
      '내 이름은 메구밍! 아크 위저드이자, 폭렬마법을 펼치는 자!'
    ];
    this.introductionSecond = [
      '어이, 내 이름에 불만이 있으면 한번 말해 봐라.'
    ];
    this.ready = false;
    bluebird.promisify(fs.access)('last_explosion').then(() => {
      return bluebird.promisify(fs.readFile)('last_explosion');
    }).then((data) => {
      this.lastExplosionTable = JSON.parse(data.toString());
      this.ready = true;
    }).catch((err) => {
      this.lastExplosionTable = {};
      console.error(err);
      this.ready = true;
    });
  }

  match(text) {
    let type;
    let test = true;
    if (text.includes("!폭렬")) type = "explosion";
    else if (text.includes("#메구밍")) type = "meguminn";
    else if (text.includes("!메구밍")) type = "meguminn";
    else test = false;
    if (!this.ready) test = false;
    return {
      accepted: test,
      args: type
    };
  }

  reply(args, sender) {
    let channel = sender.channel;
    let onExplosion = this.onExplosionTable[channel];
    let lastExplosion = this.lastExplosionTable[channel];
    if (onExplosion) return;
    let currentTime = new Date();
    const secondCall = this._isSecondCall(this.lastCallTable[args], currentTime);
    switch (args) {
      case "explosion":
        if (this._isSleeping(currentTime)) {
          sender.send('Zzz...');
          break;
        }
        if (!this._isExplodable(lastExplosion, currentTime)) {
          if (this._canRespond(lastExplosion, currentTime)) {
            if (secondCall) sender.send('폭렬마법은 제 한계까지 마력을 쓰기 때문에 하루에 한 번만 쓸 수 있어요.');
            else sender.send('마력이 부족해요.');
          } else {
            sender.send('으으...');
          }
          break;
        }
        this.onExplosionTable[channel] = true;
        randomBytesAsync(1).then((bytes) => {
          let count = bytes[0] % 4 + 2;
          sender.send('익스플로' + '오'.repeat(count) + '전!!');
          this.lastExplosionTable[channel] = currentTime.getTime();
          return bluebird.promisify(fs.writeFile)('last_explosion', JSON.stringify(this.lastExplosionTable));
        }).then(() => {
          return new Promise((resolve, reject) => {
            setTimeout(resolve, 1000);
          });
        }).then(() => {
          return new Promise((resolve, reject) => {
            sender.irc.names(channel, (err, names) => {
              if (err) reject(err);
              else resolve(names);
            });
          });
        }).then((names) => {
          for (let name of names) {
            if (name.name === sender.irc.me) {
              if (!name.mode.includes('@')) return;
              sender.irc.mode(channel, '-o', sender.irc.me);
              break;
            }
          }
          return new Promise((resolve, reject) => {
            setTimeout(resolve, 2000);
          });
        }).then(() => {
          sender.send('아윽...');
          this.onExplosionTable[channel] = false;
        }).catch((err) => {
          console.error(err.stack);
          sender.send('[ERR] 폭렬마법 시전 중 오류가 발생했습니다.');
          this.onExplosionTable[channel] = false;
        });
        break;
      case "meguminn":
        if (this._isSleeping(currentTime)) {
          sender.send('Zzz...');
          break;
        }
        if (!this._canRespond(lastExplosion, currentTime)) {
          sender.send('으으...');
          break;
        }
        let usingIntroduction;
        if (secondCall) usingIntroduction = this.introductionSecond;
        else usingIntroduction = this.introduction;
        bluebird.promisify(crypto.randomBytes)(usingIntroduction.length + 1)
        .then((bytes) => {
          let total = 0;
          for (let i = 0; i < usingIntroduction.length; i++) total += bytes[i];
          total %= usingIntroduction.length;
          sender.send(usingIntroduction[total]);
        }).catch((err) => {
          console.error(err);
          sender.send('[ERR] 자기소개 시도 중 오류가 발생했습니다.');
        });
        break;
    }
    this.lastCallTable[args] = currentTime.getTime();
  }

  _isExplodable(b, date) {
    let lastExplosion = b && new Date(b);
    return lastExplosion === undefined
      || lastExplosion.getFullYear() != date.getFullYear()
        || lastExplosion.getMonth() != date.getMonth()
          || lastExplosion.getDate() != date.getDate();
  }

  _canRespond(b, date) {
    let lastExplosion = b && new Date(b);
    if (lastExplosion === undefined) return true;
    let range = new Date(lastExplosion);
    range.setHours(range.getHours() + 1);
    return range.getTime() <= date.getTime();
  }

  _isSecondCall(b, date) {
    let lastCall = b && new Date(b);
    if (lastCall === undefined) return false;
    let range = new Date(lastCall);
    range.setSeconds(range.getSeconds() + 10);
    return range.getTime() > date.getTime();
  }

  _isSleeping(date) {
    return date.getHours() >= 22 || date.getHours() < 7;
  }
};
