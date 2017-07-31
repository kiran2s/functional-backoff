'use strict';

var Backoff = require('./Backoff');

class ExponentialBackoff extends Backoff {
    constructor(service, factor, initDelay, maxRetries, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay();
        super(service, nextDelay, initDelay, maxRetries, syncTimeout, debug);
    }

    run(sync = true, service, factor, initDelay, maxRetries, syncTimeout) {
        return sync === true ?
            this.runSync(service, factor, initDelay, maxRetries, syncTimeout) :
            this.runAsync(service, factor, initDelay, maxRetries);
    }

    runSync(service, factor, initDelay, maxRetries, syncTimeout) {
        let nextDelay = this.makeNextDelay();
        return super.runSync(service, nextDelay, initDelay, maxRetries, syncTimeout);
    }

    runAsync(service, factor, initDelay, maxRetries) {
        let nextDelay = this.makeNextDelay();
        return super.runAsync(service, nextDelay, initDelay, maxRetries);
    }

    makeNextDelay() {
        return (delayAmt => { return factor * delayAmt });
    }
}

module.exports = ExponentialBackoff;
