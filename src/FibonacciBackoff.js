'use strict';

var Backoff = require('./Backoff');

class FibonacciBackoff extends Backoff {
    constructor(service, initDelay, maxRetries, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay(initDelay);
        super(service, nextDelay, initDelay, maxRetries, syncTimeout, debug);
    }

    run(sync = true, service, factor, initDelay, maxRetries, syncTimeout) {
        return sync === true ?
            this.runSync(service, factor, initDelay, maxRetries, syncTimeout) :
            this.runAsync(service, factor, initDelay, maxRetries);
    }

    runSync(service, factor, initDelay, maxRetries, syncTimeout) {
        let nextDelay = this.makeNextDelay(initDelay);
        return super.runSync(service, nextDelay, initDelay, maxRetries, syncTimeout);
    }

    runAsync(service, factor, initDelay, maxRetries) {
        let nextDelay = this.makeNextDelay(initDelay);
        return super.runAsync(service, nextDelay, initDelay, maxRetries);
    }

    makeNextDelay(initDelay) {
        let nextDelayGenerator = function*(initDelay) {
            let fn1, fn2;
            if (Array.isArray(initDelay)) {
                fn1 = initDelay[0];
                fn2 = initDelay[1];
                if (typeof fn2 === "undefined" || fn2 === null) {
                    fn2 = fn1;
                }
            }
            else {
                fn1 = fn2 = initDelay;
            }

            for (;;) {
                let fnCurr = fn1;
                fn1 = fn2;
                fn2 = fnCurr + fn2;
                yield fnCurr;
            }
        }(initDelay);

        return function() {
            return nextDelayGenerator.next().value;
        }
    }
}

module.exports = FibonacciBackoff;
