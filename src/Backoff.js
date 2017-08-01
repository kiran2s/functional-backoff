'use strict';

class Backoff {
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
        if (typeof maxRetries === "undefined" || maxRetries === null) {
            maxRetries = this.maxRetries;
        }
        if (typeof syncTimeout === "undefined") {
            syncTimeout = this.syncTimeout;
        }

        if (maxRetries <= 0) {
            return new Promise(resolve => resolve(false));
        }

        let serviceSuccessful = false;
        let _this = this;
        let retry = function(retryNum, delayAmt) {
            if (serviceSuccessful === true) {
                return new Promise(() => {});
            }

            let failureHandler = function(retryNum, delayAmt, resolve) {
                retryNum++;
                if (retryNum > 1) {
                    delayAmt = nextDelay(delayAmt);
                }
                setTimeout(
                    () => retry(retryNum, delayAmt).then(resolveVal => resolve(resolveVal)),
                    delayAmt
                );
            };

            let eventuallyPerformAnotherRetry = true;
            let attemptService = function(retryNum, delayAmt) {
                return new Promise(function(resolve) {
                    service(retryNum, maxRetries)
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
                                failureHandler(retryNum, delayAmt, resolve);
                            }
                        });
                });
            }

            let retryAfterTimeout = function(retryNum, delayAmt) {
                return new Promise(function(resolve) {
                    setTimeout(
                        () => {
                            if (eventuallyPerformAnotherRetry === true) {
                                eventuallyPerformAnotherRetry = false;
                                _this.log("TIMEOUT");
                                failureHandler(retryNum, delayAmt, resolve);
                            }
                        },
                        syncTimeout
                    );
                });
            }

            if (syncTimeout === null) {
                return attemptService(retryNum, delayAmt);
            }
            else {
                return Promise.race(
                    [
                        attemptService(retryNum, delayAmt),
                        retryAfterTimeout(retryNum, delayAmt)
                    ]
                );
            }
        }

        return retry(0, initDelay);
    }

    runAsync(service, nextDelay, initDelay, maxRetries) {
        service = service || this.service;
        service = this.wrapService(service);
        nextDelay = nextDelay || this.nextDelay;
        if (typeof initDelay === "undefined" || initDelay === null) {
            initDelay = this.initDelay;
        }
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

        let retryAfterDelay = function(retryNum, delayAmt) {
            return new Promise(function(resolve) {
                if (retryNum < maxRetries) {
                    if (retryNum > 1) {
                        delayAmt = nextDelay(delayAmt);
                    }
                    setTimeout(
                        () => retry(retryNum, delayAmt).then(resolveVal => resolve(resolveVal)),
                        delayAmt
                    );
                }
            });
        };

        let retry = function(retryNum, delayAmt) {
            if (serviceSuccessful === true) {
                return new Promise(() => {});
            }

            return Promise.race(
                [
                    attemptService(retryNum),
                    retryAfterDelay(retryNum + 1, delayAmt)
                ]
            );
        }

        return retry(0, initDelay);
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

module.exports = Backoff;
