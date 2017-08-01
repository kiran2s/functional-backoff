'use strict';

var Backoff = require('./Backoff');

class FibonacciBackoff extends Backoff {
    constructor(service, initialDelay, maxRetries, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay(initialDelay);
        super(service, nextDelay, initialDelay, maxRetries, syncTimeout, debug);
    }

    run(sync = true, service, factor, initialDelay, maxRetries, syncTimeout) {
        return sync === true ?
            this.runSync(service, factor, initialDelay, maxRetries, syncTimeout) :
            this.runAsync(service, factor, initialDelay, maxRetries);
    }

    runSync(service, factor, initialDelay, maxRetries, syncTimeout) {
        let nextDelay = this.makeNextDelay(initialDelay);
        return super.runSync(service, nextDelay, initialDelay, maxRetries, syncTimeout);
    }

    runAsync(service, factor, initialDelay, maxRetries) {
        let nextDelay = this.makeNextDelay(initialDelay);
        return super.runAsync(service, nextDelay, initialDelay, maxRetries);
    }

    makeNextDelay(initialDelay) {
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
        }(initialDelay);

        return function() {
            return nextDelayGenerator.next().value;
        }
    }
}

module.exports = FibonacciBackoff;
