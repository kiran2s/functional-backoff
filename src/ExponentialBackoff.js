'use strict';

var Backoff = require('./Backoff');

class ExponentialBackoff extends Backoff {
    constructor(service, args, retryCondition, factor, initialDelay, maxRetries, maxDelay, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay(factor);
        super(service, args, retryCondition, nextDelay, initialDelay, maxRetries, maxDelay, syncTimeout, debug);
    }

    makeNextDelay(factor) {
        return (delayAmt => { return factor * delayAmt });
    }
}

module.exports = ExponentialBackoff;
