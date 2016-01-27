"use strict";

const _ = require('lodash');
const co = require('co');
const promisify = require('callback-and-promise');
const cacheDebug = require('debug')('concurrent-memoize:cache');
const EventEmitter = require('events').EventEmitter;
const Timer = require('./timer');
const defaultConfig = require('./defaultConfig');

const events = new EventEmitter();
const timer = new Timer('Cache Hits');
events.on('timer', timer.finish.bind(timer));

exports = module.exports = memoize;
exports.property = function(client, funcName, cacheConfig) {

  if ('executeCacheAndWrapFunction' != client[funcName].name) {
    let originalFunc = client[funcName].bind(client);
    client[funcName] = memoize(originalFunc, funcName, cacheConfig)
  }

  return client[funcName];
};
exports.defaultConfig = defaultConfig;
exports.timer = timer;


/**
 * Creates a function that interacts with a specific property attached to `Model.mysql`
 *
 * @param cacheName {String} - name of the property on Model.mysql
 * @param [initialValue] {*|Function} - if function, then the function is called, otherwise the default is an empty object.
 * @returns {Function}
 */
function createCacheAccessor(cacheName, initialValue) {

  return function() {

    // ensure that the cache location exists
    if (!this[cacheName]) {
      this[cacheName] = _.isFunction(initialValue) ? initialValue() : {};
    }

    if (!arguments.length) {
      return this[cacheName]; // return the cache
    } else if (1 == arguments.length) {
      return this[cacheName][arguments[0]]; // return the value at the cache key
    } else if (2 == arguments.length) {
      if (_.isUndefined(arguments[1])) {
        delete this[cacheName][arguments[0]];
        return undefined;
      }
      return this[cacheName][arguments[0]] = arguments[1]; // set the cache key with the given value

    } else {
      return this[cacheName][arguments[0]] = Array.prototype.slice.call(arguments, 1); // set the cache key with an array of remaining arguments
    }

  }

}

/**
 * This function is used to build `executeCacheAndWrapQuery` functions that call `Connection` functions.
 *
 * @param originalFunc {Function} the function that should be memoized
 * @param funcName {String} a unique name for the function passed in (can be the name of the function). This field can be used to define the cache key.
 * @param config {PlainObject} contains the implementation details for the cache (see
 *
 * @returns {Function}
 */
function memoize(originalFunc, funcName, config) {

  originalFunc = promisify(originalFunc);

  config = _.merge({}, defaultConfig, config);

  let cacheWrap = config.getCache(funcName);

  let cache = createCacheAccessor('cache').bind(cacheWrap);
  let cacheLock = createCacheAccessor('cacheLock').bind(cacheWrap);
  let lockWait = new EventEmitter();
  lockWait.setMaxListeners(config.maxListeners);

  /**
   * This method performs 3 convenience operations on all query data.
   *
   * 1) Executes queries made by `Connection.selectOne` and `Connection.query`.
   *
   * 2) If caching option is enabled for the query, then the results are cached per `Connection`. Per `Connection` means
   * that the cache expires at the end of the mysql connection. Caching may be specified in the options, or if not
   * specified the `Model.cachePolicy` getter function will determine if the query should be cached.
   *
   * 3) This method also calls `Model.fromRow` on each entry from the query results. Results are cached
   * after `Model.fromRow` is applied.
   *
   * @param query
   * @param bindings
   * @param queryOpts
   * @returns {Array}
   */
  return function executeCacheAndWrapFunction() {

    let timerId = timer.start();
    function finish(name) {
      //console.log(name);
      try {
        events.emit('timer', timerId, name);
      } catch (e) {
        console.log(e);
      }
    }

    let _args = arguments;
    let queryOpts = config.parseOptions.apply(config, _args);

    return co(function *() {
      // initialize the options
      if (!queryOpts) {
        queryOpts = {};
      }

      // if we haven't explicitly ordered it to cache the query, then check the cache policy
      if (_.isUndefined(queryOpts.cache) && config.allowCache()) {
        queryOpts.cache = true;
      }

      let key; // cache key

      if (queryOpts.cache) {
        // generate cache key
        key = funcName + '-' + config.cacheKey.apply(config, _args);

        // check the cache
        let rows = cache(key);
        let lock = cacheLock(key);

        if (rows) { // return if we have cache
          cacheDebug('CACHE ' + key);
          finish('cache');
          return rows;

        } else if (lock) { // if the is query is executing, then wait
          return yield new Promise(function (resolve, reject) {
            lockWait.once('query:' + key, function(result) {
              finish('lock');
              resolve(result);
            });
            lockWait.once('error:' + key, function(err) {
              finish('lock:error');
              reject(err);
            });
          });

        } else { // if neither cache nor lock exists, then set the lock and execute the query
          cacheLock(key, 1);
        }

      }

      try {
        // run the query
        var result = yield originalFunc.apply(null, _args);

        result = yield config.modifyResult(result);

      } catch (e) {
        console.error(e);
        lockWait.emit('error:' + key, e);
        finish('fresh:error');
        throw e;
      }

      // save the cache
      if (queryOpts.cache) {
        cacheDebug('FRESH ' + key);
        cache(key, result);
        cacheLock(key, undefined);
        lockWait.emit('query:' + key, result);
      }

      finish('fresh');
      return result;
    });
  }

}