module.exports = {
  /**
   * Gets the cache object where results are stored
   *
   * @param funcName {String} the same as passed in at memoize(originalFunc, funcName, config)
   * @returns {Object} an object whose keys will be cache keys
   */
  getCache: function(funcName) {
    if (!sand.context._cacheWrap) {
      sand.context._cacheWrap = {};
    }
    return sand.context._cacheWrap;
  },

  /**
   * Builds a cache key for the arguments of the function (all arguments passed in will be exactly as they are normally,
   * with the exception of callbacks (since all functions are "promisified")
   *
   * @param query - an example func arg
   * @param bindings - an example func arg
   * @param queryOpts - an example func arg
   * @returns {string} the cache key
   */
  cacheKey: function(query, bindings, queryOpts) {
    return JSON.stringify(query) + '-' + JSON.stringify(bindings) + '-' + JSON.stringify(queryOpts)
  },

  /**
   * Parses the arguments for options passed to the memoization function
   *
   * @param query - an example func arg
   * @param bindings - an example func arg
   * @param queryOpts - an example func arg
   *
   * @returns {Object|undefined} an options object or undefined
   */
  parseOptions: function(query, bindings, queryOpts) {
    return queryOpts;
  },

  /**
   * Decides if the query should be cached.
   *
   * @returns {*|boolean}
   */
  allowCache: function() {
    return sand.context && sand.context.req && 'GET' === sand.context.req.method;
  },

  /**
   * Post processes the result returned from the request. The return value of this function *will be* cached
   *
   * @param result
   * @returns {Promise.<*>}
   */
  modifyResult: function(result) {
    return Promise.resolve(result);
  },

  /**
   * Max listeners for the the lock wait. This can be used to increase the threshold at which the *EventEmitter* warning message is printed.
   */
  maxListeners: require('events').EventEmitter.defaultMaxListeners
};