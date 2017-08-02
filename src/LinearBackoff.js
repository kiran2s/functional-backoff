'use strict';

var Backoff = require('./Backoff');

class LinearBackoff extends Backoff {
    constructor(service, args, retryCondition, offset, initialDelay, maxRetries, maxDelay, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay(offset);
        super(service, args, retryCondition, nextDelay, initialDelay, maxRetries, maxDelay, syncTimeout, debug);
    }

    makeNextDelay(offset) {
        return (delayAmt => { return delayAmt + offset });
    }
}

module.exports = LinearBackoff;