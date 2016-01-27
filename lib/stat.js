"use strict";

class Stat {

  constructor(name, unit) {
    this.name = name;
    this.unit = unit;
    this.count = 0;
    this.sum = 0;
    this.sum2 = 0;
  }

  push(number) {
    this.count ++;
    this.sum += number;
    this.sum2 += number * number;
    return this;
  }

  get avg() {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  get std() {
    if (!this.count) {
      return 0;
    }
    let avg = this.avg;
    return Math.sqrt(this.sum2 / this.count - avg * avg);
  }

}

module.exports = Stat;