'use strict';

var Backoff = require('./Backoff');

class ExponentialBackoff extends Backoff {
    constructor(service, args, retryCondition, initialDelay, factor, maxRetries, maxDelay, mod = null, syncTimeout = null, debug = false) {
        super(service, args, retryCondition, initialDelay, null, maxRetries, maxDelay, syncTimeout, debug);
        this.setFactor(factor)
            .setMod(mod)
            .setNextDelay(this.makeNextDelay());
    }

    setInitialDelay(initialDelay) {
        super.setInitialDelay(initialDelay);
        this.setNextDelay(this.makeNextDelay());
        return this;
    }

    setFactor(factor) {
        this.factor = factor;
        if (typeof factor === "undefined" || factor === null) {
            this.factor = 2;
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
        }(this.initialDelay, this.factor);

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

module.exports = ExponentialBackoff;
