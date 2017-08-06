'use strict';

var Backoff = require('./Backoff');

class ExponentialBackoff extends Backoff {
    constructor(service, args, retryCondition, initialDelay, factor, maxRetries, maxDelay, mod = null, syncTimeout = null, debug = false) {
        super(service, args, retryCondition, initialDelay, null, maxRetries, maxDelay, syncTimeout, debug);
        this.setFactor(factor)
            .setMod(mod)
            .setNextDelay(this.makeNextDelay(this.initialDelay, this.factor, this.mod));
    }

    setFactor(factor) {
        this.factor = factor;
        if (typeof factor === "undefined" || factor === null) {
            this.factor = 2;
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

    makeNextDelay(initialDelay, factor, mod) {
        let nextDelayGenerator = function*(initialDelay, factor) {
            let delayAmt = initialDelay * factor;
            for (;;) {
                let reset = yield delayAmt;
                if (reset) {
                    delayAmt = initialDelay;
                }
                else {
                    delayAmt *= factor;
                }
            }
        }(initialDelay, factor);

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

module.exports = ExponentialBackoff;
