'use strict';

var Backoff = require('./Backoff');

class LinearBackoff extends Backoff {
    constructor(service, offset, initialDelay, maxRetries, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay(offset);
        super(service, nextDelay, initialDelay, maxRetries, syncTimeout, debug);
    }

    makeNextDelay(offset) {
        return (delayAmt => { return delayAmt + offset });
    }
}

module.exports = LinearBackoff;