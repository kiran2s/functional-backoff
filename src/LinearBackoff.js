'use strict';

var Backoff = require('./Backoff');

class LinearBackoff extends Backoff {
    constructor(service, args, retryCondition, initialDelay, offset, maxRetries, maxDelay, mod = null, syncTimeout = null, debug = false) {
        super(service, args, retryCondition, initialDelay, null, maxRetries, maxDelay, syncTimeout, debug);
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

    makeNextDelay(initialDelay, offset, mod) {
        let nextDelayGenerator = function*(initialDelay, offset) {
            let delayAmt = initialDelay + offset;
            for (;;) {
                let reset = yield delayAmt;
                if (reset) {
                    delayAmt = initialDelay;
                }
                else {
                    delayAmt += offset;
                }
            }
        }(initialDelay, offset);

        if (mod === null) {
            return function() {
                return nextDelayGenerator.next().value;
            }
        }
        else {
            let i = 1;
            return function() {
                if (i === mod) {
                    i = 1;
                    return nextDelayGenerator.next(true).value;
                }
                i++;
                return nextDelayGenerator.next().value;
            }
        }
    }
}

module.exports = LinearBackoff;