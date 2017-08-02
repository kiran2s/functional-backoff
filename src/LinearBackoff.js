'use strict';

var Backoff = require('./Backoff');

class LinearBackoff extends Backoff {
    constructor(service, args, retryCondition, offset, initialDelay, maxRetries, maxDelay, mod = null, syncTimeout = null, debug = false) {
        super(service, args, retryCondition, null, initialDelay, maxRetries, maxDelay, syncTimeout, debug);
        this.setOffset(offset)
            .setMod(mod)
            .setNextDelay(this.makeNextDelay(this.initialDelay, this.offset, this.mod));
    }

    setOffset(offset) {
        this.offset = offset;
        if (typeof offset === "undefined" || offset === null) {
            this.offset = 100;
        }
        return this;
    }

    setMod(mod) {
        this.mod = mod;
        if (typeof mod === "undefined") {
            this.mod = null;
        }
        return this;
    }

    makeNextDelay(offset) {
        return (delayAmt => { return delayAmt + offset });
    }

    makeNextDelay(initialDelay, offset, mod) {
        let nextDelayGenerator = function*(initialDelay, offset) {

        }

        return function() {
            
        }
    }
}

module.exports = LinearBackoff;