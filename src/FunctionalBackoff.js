'use strict';

class FunctionalBackoff {
    constructor(service, nextDelay, initDelay, maxRetries, debug = false) {
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
        this.debug = debug;

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
                                _this.log("SUCCESS");
                                resolve(true);
                            }
                            else {
                                _this.log("FAILURE");
                                resolve(false);
                            }
                        })
                        .catch(() => {
                            _this.log("FAILURE");
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

    log(msg) {
        if (this.debug) {
            console.log(Date.now() - this.initTime + ": " + msg);
        }
    }
}

module.exports = FunctionalBackoff;
