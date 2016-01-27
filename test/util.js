"use strict";

const URL = require('url');
const qs = require('querystring');

module.exports = {
  parse: function(url) {
    url = URL.parse(url);
    url.query = qs.parse(url.query) || {};
    return url;
  }
};