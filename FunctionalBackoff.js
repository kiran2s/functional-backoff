'use strict';

class FunctionalBackoff {
    constructor(service, nextDelay, initDelay, maxRetries) {
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

        this.numRetries = 0;
        this.serviceSuccessful = false;

        this.initTime = Date.now();
    }

    run() {
        let _this = this;

        return new Promise(async function(resolve, reject) {
            if (_this.MAX_RETRIES <= 0) {
                resolve(false);
            }
            else {
                while (_this.serviceSuccessful === false) {
                    _this.service(_this.numRetries)
                        .then((resolveVal) => {
                            if (resolveVal === true) {
                                _this.serviceSuccessful = true;
                                console.log(Date.now() - _this.initTime + ": SUCCESS");
                                resolve(true);
                            }
                            else {
                                console.log(Date.now() - _this.initTime + ": FAILURE");
                                resolve(false);
                            }
                        })
                        .catch(() => {
                            console.log(Date.now() - _this.initTime + ": FAILURE");
                        });
                    
                    _this.numRetries++;
                    if (_this.numRetries >= _this.MAX_RETRIES) {
                        break;
                    }
                    await _this.sleep(_this.delayAmt);
                    _this.delayAmt = _this.nextDelay(_this.delayAmt);
                }
            }
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/*
class FunctionalBackoff {
    // args: [() -> Promise] [int -> int] [int] [int]
    constructor(service, backoffFunction, maxRetries, initDelay) {
        this.service = service;
        this.backoffFunction = backoffFunction;
        this.MAX_RETRIES = maxRetries;
        this.delayAmt = initDelay;

        this.i = 0;
        this.serviceSucceeded = false;

        this.beginTime = Date.now();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // return: Promise
    run() {
        var _this = this;
        return new Promise(async function(resolve, reject) {
            if (_this.MAX_RETRIES <= 0) {
                resolve(false);
            }
            
            while (_this.serviceSucceeded === false) {
                _this.service()
                    .then(() => {
                        console.log(Date.now() - _this.beginTime + ": SUCCESS");
                        _this.serviceSucceeded = true;
                        resolve(true);
                    })
                    .catch(() => {
                        console.log(Date.now() - _this.beginTime + ": FAILURE");
                        if (_this.i >= _this.MAX_RETRIES) {
                            resolve(false);
                        }
                    });

                _this.i++;
                if (_this.i >= _this.MAX_RETRIES) {
                    break;
                }
                await _this.sleep(_this.delayAmt);
                _this.delayAmt = _this.backoffFunction(_this.delayAmt);
            }
        });
    }
}
*/

module.exports = FunctionalBackoff;
