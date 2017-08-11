'use strict';

class Backoff {
    constructor(service, args, retryCondition, initialDelay, nextDelay, 
                maxRetries, maxDelay, syncTimeout = null, debug = false) {

        this.setService(service, args)
            .setRetryCondition(retryCondition)
            .setInitialDelay(initialDelay)
            .setNextDelay(nextDelay)
            .setMaxRetries(maxRetries)
            .setMaxDelay(maxDelay)
            .setSyncTimeout(syncTimeout)
            .setDebugMode(debug);

        this.status = Backoff.Status.IDLE;

        this.initTime = Date.now();
    }

    setService(service, args) {
        this.args = args || this.args || [];
        if (typeof service === "undefined" || service === null) {
            this.service = null;
        }
        else {
            this.service = this.wrapService(service);
        }
        return this;
    }

    setServiceArgs(args) {
        this.args = args || [];
        return this;
    }

    setRetryCondition(retryCondition) {
        if (typeof retryCondition === "undefined" || retryCondition === null || retryCondition === true) {
            retryCondition = (() => true);
        }
        this.retryCondition = retryCondition;
        return this;
    }

    setInitialDelay(initialDelay) {
        if (typeof initialDelay === "undefined" || initialDelay === null) {
            initialDelay = 100;
        }
        this.initialDelay = initialDelay;
        return this;
    }

    setNextDelay(nextDelay) {
        this.nextDelay = nextDelay || (delayAmt => delayAmt);
        return this;
    }

    setMaxRetries(maxRetries) {
        if (typeof maxRetries === "undefined" || maxRetries === null) {
            maxRetries = 10;
        }
        this.maxRetries = maxRetries;
        return this;
    }

    setMaxDelay(maxDelay) {
        if (typeof maxDelay === "undefined" || maxDelay === null) {
            maxDelay = Infinity;
        }
        this.maxDelay = maxDelay;
        return this;
    }

    setSyncTimeout(syncTimeout) {
        if (typeof syncTimeout === "undefined" || syncTimeout === Infinity) {
            syncTimeout = null;
        }
        this.syncTimeout = syncTimeout;
        return this;
    }

    setDebugMode(debug) {
        this.debug = debug;
        return this;
    }

    getStatus() {
        return this.status;
    }

    run(sync = true) {
        return sync === true ?
            this.runSync() :
            this.runAsync();
    }

    runSync() {
        this.status = Backoff.Status.RUNNING;

        let reason = this.checkForEarlyErrors();
        if (this.status === Backoff.Status.IDLE) {
            return new Promise((resolve, reject) => reject(reason));
        }

        let local = this.getLocalCopies();
        let serviceSuccessful = false;
        let _this = this;

        let retryAfterDelay = function(retryNum, delayAmt, resolve, reject) {
            if (retryNum > 1) {
                delayAmt = local.nextDelay(delayAmt);
            }
            if (delayAmt > local.maxDelay) {
                delayAmt = local.maxDelay;
            }
            setTimeout(
                () => {
                    _this.log("Backoff delay amount: " + delayAmt);
                    retry(retryNum, delayAmt)
                    .then(val => resolve(val))
                    .catch(reason => reject(reason));
                },
                delayAmt
            );
        };

        let retry = function(retryNum, delayAmt) {
            if (serviceSuccessful === true) {
                return new Promise(() => {});
            }

            let eventuallyPerformAnotherRetry = true;
            let attemptService = function(retryNum, delayAmt) {
                return new Promise(function(resolve, reject) {
                    local.service(local.args, retryNum, local.maxRetries, local.retryCondition)
                        .then(result => {
                            eventuallyPerformAnotherRetry = false;
                            if (result.success === true) {
                                serviceSuccessful = true;
                                _this.log("SUCCESS");
                                resolve(result.value);
                            }
                            else {
                                _this.log("FAILURE");
                                reject(result.value);
                            }
                        })
                        .catch(() => {
                            if (eventuallyPerformAnotherRetry === true) {
                                eventuallyPerformAnotherRetry = false;
                                _this.log("RETRY");
                                retryAfterDelay(retryNum + 1, delayAmt, resolve, reject);
                            }
                        });
                });
            };

            let retryAfterTimeout = function(retryNum, delayAmt) {
                return new Promise(function(resolve, reject) {
                    setTimeout(
                        () => {
                            _this.log("Timeout amount: " + local.syncTimeout);
                            if (eventuallyPerformAnotherRetry === true) {
                                eventuallyPerformAnotherRetry = false;
                                _this.log("TIMEOUT");
                                if (retryNum >= local.maxRetries - 1) {
                                    reject(Backoff.Reason.retryLimitReached);
                                }
                                else {
                                    retryAfterDelay(retryNum + 1, delayAmt, resolve, reject);
                                }
                            }
                        },
                        local.syncTimeout
                    );
                });
            };

            if (local.syncTimeout === null) {
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

        return retry(0, local.initialDelay);
    }

    runAsync() {
        this.status = Backoff.Status.RUNNING;

        let reason = this.checkForEarlyErrors();
        if (this.status === Backoff.Status.IDLE) {
            return new Promise((resolve, reject) => reject(reason));
        }

        let local = this.getLocalCopies();
        let serviceSuccessful = false;
        let _this = this;

        let attemptService = function(retryNum) {
            return new Promise(function(resolve, reject) {
                local.service(local.args, retryNum, local.maxRetries, local.retryCondition)
                    .then(result => {
                        if (result.success === true) {
                            serviceSuccessful = true;
                            _this.log("SUCCESS");
                            resolve(result.value);
                        }
                        else {
                            _this.log("FAILURE");
                            reject(result.value);
                        }
                    })
                    .catch(() => {
                        _this.log("RETRY");
                    });
            });
        };

        let retryAfterDelay = function(retryNum, delayAmt) {
            return new Promise(function(resolve, reject) {
                if (retryNum < local.maxRetries) {
                    if (retryNum > 1) {
                        delayAmt = local.nextDelay(delayAmt);
                    }
                    if (delayAmt > local.maxDelay) {
                        delayAmt = local.maxDelay;
                    }
                    setTimeout(
                        () => {
                            _this.log("Backoff delay amount: " + delayAmt);
                            retry(retryNum, delayAmt)
                            .then(val => resolve(val))
                            .catch(reason => reject(reason));
                        },
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

        return retry(0, local.initialDelay);
    }

    /* Helper methods */
    wrapService(service) {
        let _this = this;
        return function(args, retryNum, maxRetries, retryCondition) {
            return new Promise(function(resolve, reject) {
                service(...args)
                    .then(val => {
                        _this.status = Backoff.Status.IDLE;
                        resolve({ success: true, value: val });
                    })
                    .catch(reason => {
                        if (retryNum >= maxRetries - 1) {
                            _this.status = Backoff.Status.IDLE;
                            resolve({ success: false, value: reason });
                        }
                        else {
                            if (retryCondition(reason)) {
                                reject(reason);
                            }
                            else {
                                _this.status = Backoff.Status.IDLE;
                                resolve({ success: false, value: reason });
                            }
                        }
                    });
            });
        };
    }

    checkForEarlyErrors() {
        let reason = "";
        if (this.service === null || this.maxRetries <= 0) {
            this.status = Backoff.Status.IDLE;
            if (this.service === null) {
                reason = Backoff.Reason.serviceNotSet;
            }
            else {
                reason = Backoff.Reason.retryLimitReached;
            }
        }

        return reason;
    }

    getLocalCopies() {
        return {
            service: this.service,
            args: this.deepCopy(this.args),
            retryCondition: this.retryCondition,
            initialDelay: this.initialDelay,
            nextDelay: this.nextDelay,
            maxRetries: this.maxRetries,
            maxDelay: this.maxDelay,
            syncTimeout: this.syncTimeout
        };
    }

    deepCopy(obj) {
	    if (obj === undefined || obj === null || typeof obj !== "object") {
            return obj;
        }

	    let copy = obj.constructor();
	    for (let attr in obj) {
	        if (obj.hasOwnProperty(attr)) {
                copy[attr] = this.deepCopy(obj[attr]);
            }
	    }
	    return copy;
	}

    log(msg) {
        if (this.debug) {
            console.log(Date.now() - this.initTime + ": " + msg);
        }
    }
}

Backoff.Status = {
    IDLE:       "idle",
    RUNNING:    "running"
};

Backoff.Reason = {
    serviceNotSet:          "Error: Service must be set before running backoff.",
    retryLimitReached:      "Maximum retry limit reached."
};

module.exports = Backoff;
