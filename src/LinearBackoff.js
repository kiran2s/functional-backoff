'use strict';

var Backoff = require('./Backoff');

class LinearBackoff extends Backoff {
    constructor(service, args, retryCondition, initialDelay, offset, maxRetries, maxDelay, mod = null, syncTimeout = null, debug = false) {
        super(service, args, retryCondition, initialDelay, null, maxRetries, maxDelay, syncTimeout, debug);
        this.setOffset(offset)
            .setMod(mod)
            .setNextDelay(this.makeNextDelay());
    }

    setInitialDelay(initialDelay) {
        super.setInitialDelay(initialDelay);
        this.setNextDelay(this.makeNextDelay());
        return this;
    }

    setOffset(offset) {
        this.offset = offset;
        if (typeof offset === "undefined" || offset === null) {
            this.offset = 100;
        }
        this.setNextDelay(this.makeNextDelay());
        return this;
    }

    setMod(mod) {
        this.mod = mod;
        if (typeof mod === "undefined") {
            this.mod = null;
        }
        this.setNextDelay(this.makeNextDelay());
        return this;
    }

    makeNextDelay() {
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
        }(this.initialDelay, this.offset);

        if (typeof this.mod === "undefined" || this.mod === null) {
            return function() {
                return nextDelayGenerator.next().value;
            }
        }
        else {
            let mod = this.mod;
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