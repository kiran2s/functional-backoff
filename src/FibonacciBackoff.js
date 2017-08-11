'use strict';

var Backoff = require('./Backoff');

class FibonacciBackoff extends Backoff {
    constructor(service, args, retryCondition, initialDelay, maxRetries, maxDelay, syncTimeout = null, debug = false) {
        super(service, args, retryCondition, initialDelay, null, maxRetries, maxDelay, syncTimeout, debug);
        this.setNextDelay(this.makeNextDelay());
    }

    setInitialDelay(initialDelay) {
        super.setInitialDelay(initialDelay);
        this.setNextDelay(this.makeNextDelay());
        return this;
    }

    makeNextDelay() {
        let nextDelayGenerator = function*(initialDelay) {
            let fn1, fn2;
            if (Array.isArray(initialDelay)) {
                fn1 = initialDelay[0];
                fn2 = initialDelay[1];
                if (typeof fn2 === "undefined" || fn2 === null) {
                    fn2 = fn1;
                }
            }
            else {
                fn1 = fn2 = initialDelay;
            }

            for (;;) {
                let fnCurr = fn1;
                fn1 = fn2;
                fn2 = fnCurr + fn2;
                yield fnCurr;
            }
        }(this.initialDelay);

        nextDelayGenerator.next();

        return function() {
            return nextDelayGenerator.next().value;
        }
    }
}

module.exports = FibonacciBackoff;
