"use strict";

process.env.DEBUG = 'concurrent-memoize:cache';
process.env.NODE_DEBUG = 'concurrent-memoize:cache';

let server;
let cache = {};

const memoize = require('..');
const async = require('async');
const util = require('./util');
const createServer = require('./server');
const request = memoize(require('request'), 'request', {
  getCache: function() {
    return cache;
  },
  cacheKey: function(opts) {
    return JSON.stringify(util.parse(opts).pathname);
  },
  parseOptions: function(opts, queryOpts) {
    return queryOpts;
  },
  allowCache: function() {
    return true;
  }
});

describe('Concurrent Memoize', function() {
  this.timeout(10000);

  before(function() {
    server = createServer();
  });

  after(function() {
    server.close();
  });

  it('should intercept concurrent requests', function(done) {

    async.waterfall([
      function(done) {
        async.parallel([
          makeRequest('', 1000),
          makeRequest('', 750),
        ], done);
      },
      function(result, done) {
        async.parallel([
          makeRequest('', 1000),

          makeRequest('user/1', 1000),
          makeRequest('user/1', 750),

          makeRequest('user/2', 1000),
          makeRequest('user/2', 750),

          makeRequest('user/3', 1000),
          makeRequest('user/3', 750),

          makeRequest('user/4', 1000),
          makeRequest('user/4', 750),
        ], done);
      },
      function(result, done) {
        async.parallel([
          makeRequest('user/1', 1500),
          makeRequest('user/2', 1500),
          makeRequest('user/3', 1500),
          makeRequest('user/4', 1500)
        ], done)
      }
    ], function() {
      try {
        console.log(memoize.timer.toString());
      } catch (e) {
        console.error(e);
      }

      memoize.timer.stat.count.should.be.eql(15);
      memoize.timer.stats.lock.count.should.be.eql(5);
      memoize.timer.stats.cache.count.should.be.eql(5);
      memoize.timer.stats.fresh.count.should.be.eql(5);

      done();
    });

    function makeRequest(opts, millis) {
      return function(done) {
        request('http://localhost:3000/' + opts + '?wait=' + millis).then(function() {
          done(arguments[1]);
        });
      }
    }

  });

});

