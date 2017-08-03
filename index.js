'use strict';

var Backoff = require('./src/Backoff');
var LinearBackoff = require('./src/LinearBackoff');
var ExponentialBackoff = require('./src/ExponentialBackoff');
var FibonacciBackoff = require('./src/FibonacciBackoff');

module.exports = {
    Backoff: Backoff,
    LinearBackoff: LinearBackoff,
    ExponentialBackoff: ExponentialBackoff,
    FibonacciBackoff: FibonacciBackoff 
};
