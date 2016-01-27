# Concurrent Memoize

Memoize Concurrent Requests in your Application so that only one request is executed and all subsequent, concurrent, waiting requests that are identical to the first request get notified with the result of the first call. Also all future accesses of the value return cache.

## Install

`npm install concurrent-memoize`

## Why?

Often times organized, reusable code may make many duplicate calls. These calls may be database queries, HTTP requests, other third party requests. This module de-duplicates asynchronous, simultaneous requests, in this way

1. Check cache. If it exists, return instantly, and notify all other *identical* waiting requests of the result.
2. Check if an *identical* request is currently executing. If so, wait for the response to that request.
3. If no cache exists and no request is executing, then begin executing the request.

## A bit of history

This module was originally created to keep a _per request_ cache of all database queries made during a single HTTP GET request within a REST API. The cache only exists per request, eliminating the problem of stale data since most requests are very short lived. Executing in a GET request ensured that (for the most part) no data in the cache could become stale, since GET requests, by convention, should not make major database modifications anyway (by convention, major database modifications should be done in POST/PUT/etc requests).

## Usage

```JavaScript
"use strict";

let cache = {};

const memoize = require('concurrent-memoize');

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

// ...
 
request('http://localhost/')
  .then(function(err, result) {
    console.log("I'm fresh!")    
  });
request('http://localhost/')
  .then(function(err, result) {
    console.log("I'm cached!");
  });
```

## Documentation

**memoize(originalFunc, funcName, config)**

This function will return another function that wraps *originalFunc*. The function returned will be "promisified" in that if it the function normally responds asynchronously with a callback, it will also work with a promise if no callback is passed. Calling this function will transparently check cache, wait for a result, or execute the query to get the result.

**memoize.property(object, funcName, config)**

This function is a shortcut to apply the `memoize` to the property name `funcName` on the object `object`. The `this` is preserved on the overriden function.

**memoize.timer**

Keeps track of statistics across the lifetime of the `process`.

**memoize.defaultConfig**

Contains the base config for a managing cache (see `lib/defaultConfig` for documentation).

## License

ISC

