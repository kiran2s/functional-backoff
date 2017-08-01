'use strict';

var Backoff = require('./Backoff');

class ExponentialBackoff extends Backoff {
    constructor(service, factor, initialDelay, maxRetries, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay();
        super(service, nextDelay, initialDelay, maxRetries, syncTimeout, debug);
    }

    run(sync = true, service, factor, initialDelay, maxRetries, syncTimeout) {
        return sync === true ?
            this.runSync(service, factor, initialDelay, maxRetries, syncTimeout) :
            this.runAsync(service, factor, initialDelay, maxRetries);
    }

    runSync(service, factor, initialDelay, maxRetries, syncTimeout) {
        let nextDelay = this.makeNextDelay();
        return super.runSync(service, nextDelay, initialDelay, maxRetries, syncTimeout);
    }

    runAsync(service, factor, initialDelay, maxRetries) {
        let nextDelay = this.makeNextDelay();
        return super.runAsync(service, nextDelay, initialDelay, maxRetries);
    }

    makeNextDelay() {
        return (delayAmt => { return factor * delayAmt });
    }
}

module.exports = ExponentialBackoff;
