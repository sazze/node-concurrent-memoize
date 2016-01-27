"use strict";

const http = require('http');
const _ = require('lodash');
const util = require('./util');

module.exports = function() {
  let server = http.createServer(requestHandler);
  server.listen(3000);
  return server;
};

//module.exports();

const john = {
  userId: 1,
  name: 'John',
  friends: [
    2,
    3
  ]
};

const jane = {
  userId: 2,
  name: 'Jane',
  friends: [
    3,
    4
  ]
};

const mike = {
  userId: 3,
  name: 'Mike',
  friends: [
    4,
    1
  ]
};

const tom = {
  userId: 4,
  name: 'Tom',
  friends: [
    1,
    2
  ]
};

const users = {
  1: john,
  2: jane,
  3: mike,
  4: tom
};

function requestHandler(req, res) {
  let data = handler(req);
  let statusCode = 200;
  if (null == data) {
    statusCode = 404;
    data = {
      error: 'Not found'
    };
  } else {
    data = {
      error: null,
      results: data
    };
  }

  let query = util.parse(req.url).query;
  setTimeout(function() {
    res.statusCode = statusCode;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(data));
  }, query.wait || 0)

}

function handler(req) {
  let matches;
  if (matches = /\/user\/(\d+)/.exec(req.url)) {
    return matches && matches[1] ? users[matches[1]] : null;

  } else {
    return _.map(users, function(user) {
      user = _.merge({}, user);
      delete user.friends;
      return user;
    })
  }
}