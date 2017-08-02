'use strict';

class Backoff {
    constructor(service, args, retryCondition, nextDelay, initialDelay, 
                maxRetries, maxDelay, syncTimeout = null, debug = false) {
        this.setService(service, args)
            .setRetryCondition(retryCondition)
            .setNextDelay(nextDelay)
            .setInitialDelay(initialDelay)
            .setMaxRetries(maxRetries)
            .setMaxDelay(maxDelay)
            .setSyncTimeout(syncTimeout)
            .setDebugMode(debug);

        this.initTime = Date.now();
    }

    setService(service, args) {
        this.args = args || this.args || [];
        this.service = this.wrapService(service);
        return this;
    }

    setServiceArgs(args) {
        this.args = args;
        return this;
    }

    setRetryCondition(retryCondition) {
        this.retryCondition = retryCondition || (() => true);
        return this;
    }

    setNextDelay(nextDelay) {
        nextDelay = nextDelay || (delayAmt => delayAmt);
        this.nextDelay = this.wrapNextDelay(nextDelay);
        return this;
    }

    setInitialDelay(initialDelay) {
        this.initialDelay = initialDelay;
        if (typeof initialDelay === "undefined" || initialDelay === null) {
            this.initialDelay = 100;
        }
        return this;
    }

    setMaxRetries(maxRetries) {
        this.maxRetries = maxRetries;
        if (typeof maxRetries === "undefined" || maxRetries === null) {
            this.maxRetries = 10;
        }
        return this;
    }

    setMaxDelay(maxDelay) {
        this.maxDelay = maxDelay;
        if (typeof maxDelay === "undefined" || maxDelay === null) {
            this.maxDelay = Infinity;
        }
        return this;
    }

    setSyncTimeout(syncTimeout) {
        this.syncTimeout = syncTimeout;
        if (typeof syncTimeout === "undefined") {
            this.syncTimeout = null;
        }
        return this;
    }

    setDebugMode(debug) {
        this.debug = debug;
        return this;
    }

    run(sync = true) {
        return sync === true ?
            this.runSync() :
            this.runAsync();
    }

    runSync() {
        let service = this.service;
        let args = this.args;
        let retryCondition = this.retryCondition;
        let nextDelay = this.nextDelay;
        let initialDelay = this.initialDelay;
        let maxRetries = this.maxRetries;
        let maxDelay = this.maxDelay;
        let syncTimeout = this.syncTimeout;

        if (maxRetries <= 0) {
            return new Promise((resolve, reject) => reject("Max retries is not a positive number."));
        }

        let serviceSuccessful = false;
        let _this = this;
        let retry = function(retryNum, delayAmt) {
            if (serviceSuccessful === true) {
                return new Promise(() => {});
            }

            let failureHandler = function(retryNum, delayAmt, resolve, reject) {
                retryNum++;
                if (retryNum > 1) {
                    delayAmt = nextDelay(delayAmt, maxDelay);
                }
                setTimeout(
                    () => retry(retryNum, delayAmt)
                        .then(function() { resolve(...Array.from(arguments)); })
                        .catch(function() { reject(...Array.from(arguments)); }),
                    delayAmt
                );
            };

            let eventuallyPerformAnotherRetry = true;
            let attemptService = function(retryNum, delayAmt) {
                return new Promise(function(resolve, reject) {
                    service(args, retryNum, maxRetries, retryCondition)
                        .then(function(resolveVal) {
                            eventuallyPerformAnotherRetry = false;
                            let results = Array.from(arguments);
                            results.shift();
                            if (resolveVal === true) {
                                serviceSuccessful = true;
                                _this.log("SUCCESS");
                                resolve(...results);
                            }
                            else {
                                _this.log("FAILURE");
                                reject(...results);
                            }
                        })
                        .catch(() => {
                            if (eventuallyPerformAnotherRetry === true) {
                                eventuallyPerformAnotherRetry = false;
                                _this.log("RETRY");
                                failureHandler(retryNum, delayAmt, resolve, reject);
                            }
                        });
                });
            }

            let retryAfterTimeout = function(retryNum, delayAmt) {
                return new Promise(function(resolve, reject) {
                    setTimeout(
                        () => {
                            if (eventuallyPerformAnotherRetry === true) {
                                eventuallyPerformAnotherRetry = false;
                                _this.log("TIMEOUT");
                                failureHandler(retryNum, delayAmt, resolve, reject);
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

        return retry(0, initialDelay);
    }

    runAsync() {
        let service = this.service;
        let args = this.args;
        let retryCondition = this.retryCondition;
        let nextDelay = this.nextDelay;
        let initialDelay = this.initialDelay;
        let maxRetries = this.maxRetries;
        let maxDelay = this.maxDelay;

        if (maxRetries <= 0) {
            return new Promise((resolve, reject) => reject("Max retries is not a positive number."));
        }

        let serviceSuccessful = false;
        let _this = this;

        let attemptService = function(retryNum) {
            return new Promise(function(resolve, reject) {
                service(args, retryNum, maxRetries, retryCondition)
                    .then(function(resolveVal) {
                        let results = Array.from(arguments);
                        results.shift();
                        if (resolveVal === true) {
                            serviceSuccessful = true;
                            _this.log("SUCCESS");
                            resolve(...results);
                        }
                        else {
                            _this.log("FAILURE");
                            reject(...results);
                        }
                    })
                    .catch(() => {
                        _this.log("RETRY");
                    });
            });
        };

        let retryAfterDelay = function(retryNum, delayAmt) {
            return new Promise(function(resolve, reject) {
                if (retryNum < maxRetries) {
                    if (retryNum > 1) {
                        delayAmt = nextDelay(delayAmt, maxDelay);
                    }
                    setTimeout(
                        () => retry(retryNum, delayAmt)
                            .then(function() { resolve(...Array.from(arguments)); })
                            .catch(function() { reject(...Array.from(arguments)); }),
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

        return retry(0, initialDelay);
    }

    wrapService(service) {
        return function(args, retryNum, maxRetries, retryCondition) {
            return new Promise(function(resolve, reject) {
                service(...args)
                    .then(function() {
                        resolve(true, ...Array.from(arguments));
                    })
                    .catch(function() {
                        let catchArgs = Array.from(arguments);
                        if (retryNum >= maxRetries - 1) {
                            resolve(false, ...catchArgs);
                        }
                        else {
                            if (retryCondition(Array.from(arguments))) {
                                reject(catchArgs);
                            }
                            else {
                                resolve(false, ...catchArgs);
                            }
                        }
                    });
            });
        };
    }

    wrapNextDelay(nextDelay) {
        return function(delayAmt, maxDelay) {
            let nextDelayAmt = nextDelay(delayAmt);
            if (nextDelayAmt > maxDelay) {
                nextDelayAmt = maxDelay;
            }
            return nextDelayAmt;
        }
    }

    log(msg) {
        if (this.debug) {
            console.log(Date.now() - this.initTime + ": " + msg);
        }
    }
}

module.exports = Backoff;
