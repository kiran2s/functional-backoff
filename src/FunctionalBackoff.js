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

    run(sync = true, rec = true) {
        return sync === true ? this.runSync() : this.runAsync(rec);
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
                return new Promise(function(resolve, reject) {
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
                return new Promise(function(resolve, reject) {
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

    runAsync(rec = true) {
        return rec === true ? this.runAsyncRecursive() : this.runAsyncIterative();
    }

    runAsyncIterative() {
        if (this.MAX_RETRIES <= 0) {
            return new Promise(resolve => resolve(false));
        }

        let numRetries = 0;
        let serviceSuccessful = false;
        let _this = this;
        return new Promise(async function(resolve, reject) {
            while (serviceSuccessful === false) {
                _this.service(numRetries)
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
                
                numRetries++;
                if (numRetries >= _this.MAX_RETRIES) {
                    break;
                }
                await _this.sleep(_this.delayAmt);
                _this.delayAmt = _this.nextDelay(_this.delayAmt);
            }
        });
    }

    runAsyncRecursive() {
        if (this.MAX_RETRIES <= 0) {
            return new Promise(resolve => resolve(false));
        }

        let numRetries = 0;
        let serviceSuccessful = false;
        let _this = this;
        let retry = function() {
            return new Promise(function(resolve, reject) {
                if (serviceSuccessful === false) {
                    _this.service(numRetries)
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
                    
                    numRetries++;
                    if (numRetries < _this.MAX_RETRIES) {
                        if (numRetries > 1) {
                            _this.delayAmt = _this.nextDelay(_this.delayAmt);
                        }
                        setTimeout(
                            () => retry().then(resolveVal => resolve(resolveVal)),
                            _this.delayAmt
                        );
                    }
                }
            });
        }

        return retry();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(msg) {
        if (this.debug) {
            console.log(Date.now() - this.initTime + ": " + msg);
        }
    }
}

module.exports = FunctionalBackoff;
