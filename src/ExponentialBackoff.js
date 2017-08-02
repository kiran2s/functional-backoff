'use strict';

var Backoff = require('./Backoff');

class ExponentialBackoff extends Backoff {
    constructor(service, factor, initialDelay, maxRetries, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay(factor);
        super(service, nextDelay, initialDelay, maxRetries, syncTimeout, debug);
    }

    makeNextDelay(factor) {
        return (delayAmt => { return factor * delayAmt });
    }
}

module.exports = ExponentialBackoff;
