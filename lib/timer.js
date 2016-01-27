"use strict";

const Stat = require('./stat');
const COUNTER_MIN = 1;
const COUNTER_MAX = 1000000;
let counter = COUNTER_MIN;

class Timer {

  constructor(name, resolution) {
    this.stat = new Stat(name, 'time');
    this.stats = {};
    this.resolution = resolution || 6;
    this.startTimes = {};
  }

  start() {
    if (counter > COUNTER_MAX) {
      counter = COUNTER_MIN;
    }
    let id = counter ++;
    this.startTimes[id] = process.hrtime();
    return id;
  }

  finish(id, key) {
    if (!id) {
      throw new Error('ID is required to finish a timer');
    }
    if (!this.stats[key]) {
      this.stats[key] = new Stat(key, 'time');
    }
    let diff = process.hrtime(this.startTimes[id]);
    diff = parseInt(((diff[0] * 1e9 + diff[1]) / 1e9) * Math.pow(10, this.resolution));
    this.stats[key].push(diff);
    this.stat.push(diff);
    delete this.startTimes[id];
    return this;
  }
  
  toString() {
    // Response Time (4.500000+/-1.000000 seconds; 100 points)
    return [this.printStat(this.stat)].concat(Object.keys(this.stats).map(function(key) {
      return this.printStat(this.stats[key]);
    }.bind(this))).join('\n');
  }

  printStat(stat) {
    let resolution = parseInt(Math.pow(10, this.resolution));
    return `${
      stat.name} (${
      (stat.avg / resolution).toFixed(this.resolution)} +/- ${
      (stat.std / resolution).toFixed(this.resolution)} sec; ${
      stat.count} / ${
      this.stat.count} points; ${
      (stat.count / this.stat.count * 100).toFixed(1)}%)`;
  }

}

module.exports = Timer;