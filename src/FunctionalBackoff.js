'use strict';

class FunctionalBackoff {
    constructor(service, nextDelay, initDelay, maxRetries, syncTimeout = null, debug = false) {
        if (service) {
            this.service = service;
        }

        this.nextDelay = nextDelay;
        this.initDelay = initDelay;
        this.maxRetries = maxRetries;
        this.syncTimeout = syncTimeout;
        this.debug = debug;

        this.initTime = Date.now();
    }

    run(sync = true, service, nextDelay, initDelay, maxRetries, syncTimeout) {
        return sync === true ?
            this.runSync(service, nextDelay, initDelay, maxRetries, syncTimeout) :
            this.runAsync(service, nextDelay, initDelay, maxRetries);
    }

    runSync(service, nextDelay, initDelay, maxRetries, syncTimeout) {
        service = service || this.service;
        service = this.wrapService(service);
        nextDelay = nextDelay || this.nextDelay;
        if (typeof initDelay === "undefined" || initDelay === null) {
            initDelay = this.initDelay;
        }
        let delayAmt = initDelay;
        if (typeof maxRetries === "undefined" || maxRetries === null) {
            maxRetries = this.maxRetries;
        }
        if (typeof syncTimeout === "undefined" || syncTimeout === null) {
            syncTimeout = this.syncTimeout;
        }

        if (maxRetries <= 0) {
            return new Promise(resolve => resolve(false));
        }

        let numRetries = 0;
        let serviceSuccessful = false;
        let _this = this;
        let retry = function() {
            if (serviceSuccessful === true) {
                return new Promise(() => {});
            }

            let eventuallyPerformAnotherRetry = true;
            let attemptService = function() {
                return new Promise(function(resolve) {
                    service(numRetries, maxRetries)
                        .then(resolveVal => {
                            eventuallyPerformAnotherRetry = false;
                            if (resolveVal === true) {
                                serviceSuccessful = true;
                                _this.log("SUCCESS");
                            }
                            else {
                                _this.log("FAILURE");
                            }
                            resolve(resolveVal);
                        })
                        .catch(() => {
                            if (eventuallyPerformAnotherRetry === true) {
                                eventuallyPerformAnotherRetry = false;
                                _this.log("FAILURE");
                                numRetries++;
                                if (numRetries > 1) {
                                    delayAmt = nextDelay(delayAmt);
                                }
                                setTimeout(
                                    () => retry().then(resolveVal => resolve(resolveVal)),
                                    delayAmt
                                );
                            }
                        });
                });
            }

            let retryAfterTimeout = function() {
                return new Promise(function(resolve) {
                    setTimeout(
                        () => {
                            if (eventuallyPerformAnotherRetry === true) {
                                eventuallyPerformAnotherRetry = false;
                                _this.log("TIMEOUT");
                                numRetries++;
                                if (numRetries > 1) {
                                    delayAmt = nextDelay(delayAmt);
                                }
                                retry().then(resolveVal => resolve(resolveVal));
                            }
                        },
                        syncTimeout
                    );
                });
            }

            if (syncTimeout === null) {
                return attemptService();
            }
            else {
                return Promise.race(
                    [
                        attemptService(),
                        retryAfterTimeout()
                    ]
                );
            }
        }

        return retry();
    }

    runAsync(service, nextDelay, initDelay, maxRetries) {
        service = service || this.service;
        service = this.wrapService(service);
        nextDelay = nextDelay || this.nextDelay;
        if (typeof initDelay === "undefined" || initDelay === null) {
            initDelay = this.initDelay;
        }
        let delayAmt = initDelay;
        if (typeof maxRetries === "undefined" || maxRetries === null) {
            maxRetries = this.maxRetries;
        }

        if (maxRetries <= 0) {
            return new Promise(resolve => resolve(false));
        }

        let serviceSuccessful = false;
        let _this = this;

        let attemptService = function(retryNum) {
            return new Promise(function(resolve) {
                service(retryNum, maxRetries)
                    .then(resolveVal => {
                        if (resolveVal === true) {
                            serviceSuccessful = true;
                            _this.log("SUCCESS");
                        }
                        else {
                            _this.log("FAILURE");
                        }
                        resolve(resolveVal);
                    })
                    .catch(() => {
                        _this.log("FAILURE");
                    });
            });
        };

        let retryAfterDelay = function(retryNum) {
            return new Promise(function(resolve) {
                if (retryNum < maxRetries) {
                    if (retryNum > 1) {
                        delayAmt = nextDelay(delayAmt);
                    }
                    setTimeout(
                        () => retry(retryNum).then(resolveVal => resolve(resolveVal)),
                        delayAmt
                    );
                }
            });
        };

        let retry = function(retryNum) {
            if (serviceSuccessful === true) {
                return new Promise(() => {});
            }

            return Promise.race(
                [
                    attemptService(retryNum),
                    retryAfterDelay(retryNum + 1)
                ]
            );
        }

        return retry(0);
    }

    wrapService(service) {
        return function(retryNum, maxRetries) {
            return new Promise(function(resolve, reject) {
                service()
                    .then(() => {
                        resolve(true);
                    })
                    .catch(() => {
                        if (retryNum >= maxRetries - 1) {
                            resolve(false);
                        }
                        else {
                            reject();
                        }
                    });
            });
        };
    }

    log(msg) {
        if (this.debug) {
            console.log(Date.now() - this.initTime + ": " + msg);
        }
    }
}

module.exports = FunctionalBackoff;
