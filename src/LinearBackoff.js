'use strict';

var Backoff = require('./Backoff');

class LinearBackoff extends Backoff {
    constructor(service, offset, initialDelay, maxRetries, syncTimeout = null, debug = false) {
        let nextDelay = this.makeNextDelay(offset);
        super(service, nextDelay, initialDelay, maxRetries, syncTimeout, debug);
    }

    run(sync = true, service, offset, initialDelay, maxRetries, syncTimeout) {
        return sync === true ?
            this.runSync(service, offset, initialDelay, maxRetries, syncTimeout) :
            this.runAsync(service, offset, initialDelay, maxRetries);
    }

    runSync(service, offset, initialDelay, maxRetries, syncTimeout) {
        let nextDelay = this.makeNextDelay(offset);
        return super.runSync(service, nextDelay, initialDelay, maxRetries, syncTimeout);
    }

    runAsync(service, offset, initialDelay, maxRetries) {
        let nextDelay = this.makeNextDelay(offset);
        return super.runAsync(service, nextDelay, initialDelay, maxRetries);
    }

    makeNextDelay(offset) {
        return (delayAmt => { return delayAmt + offset });
    }
}

module.exports = LinearBackoff;