'use strict';

class FunctionalBackoff {
    constructor(service, nextDelay, initDelay, maxRetries, syncTimeout = null, debug = false) {
        let _this = this;
        this.service = function(retryNum) {
            return new Promise(function(resolve, reject) {
                service()
                    .then(() => {
                        resolve(true);
                    })
                    .catch(() => {
                        if (retryNum >= _this.MAX_RETRIES - 1) {
                            resolve(false);
                        }
                        else {
                            reject();
                        }
                    });
            });
        }

        this.nextDelay = nextDelay;
        this.delayAmt = initDelay;
        this.MAX_RETRIES = maxRetries;
        this.syncTimeout = syncTimeout;
        this.debug = debug;

        this.initTime = Date.now();
    }

    run(sync = true) {
        return sync === true ? this.runSync() : this.runAsync();
    }

    runSync() {
        if (this.MAX_RETRIES <= 0) {
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
                    _this.service(numRetries)
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
                                    _this.delayAmt = _this.nextDelay(_this.delayAmt);
                                }
                                setTimeout(
                                    () => retry().then(resolveVal => resolve(resolveVal)),
                                    _this.delayAmt
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
                                    _this.delayAmt = _this.nextDelay(_this.delayAmt);
                                }
                                retry().then(resolveVal => resolve(resolveVal));
                            }
                        },
                        _this.syncTimeout
                    );
                });
            }

            if (_this.syncTimeout === null) {
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

    runAsync() {
        if (this.MAX_RETRIES <= 0) {
            return new Promise(resolve => resolve(false));
        }

        let serviceSuccessful = false;
        let _this = this;

        let attemptService = function(retryNum) {
            return new Promise(function(resolve) {
                _this.service(retryNum)
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
                if (retryNum < _this.MAX_RETRIES) {
                    if (retryNum > 1) {
                        _this.delayAmt = _this.nextDelay(_this.delayAmt);
                    }
                    setTimeout(
                        () => retry(retryNum).then(resolveVal => resolve(resolveVal)),
                        _this.delayAmt
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

    log(msg) {
        if (this.debug) {
            console.log(Date.now() - this.initTime + ": " + msg);
        }
    }
}

module.exports = FunctionalBackoff;
