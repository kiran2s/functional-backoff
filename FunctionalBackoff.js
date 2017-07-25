'use strict';

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
            if (_this.i <= 0) {
                resolve(false);
            }
            
            while (_this.i < _this.MAX_RETRIES && _this.serviceSucceeded === false) {
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

/*
class FunctionalBackoff {
    constructor(service, backoffFunction, maxRetries, initDelay) {
        this.service = service;
        this.backoffFunction = backoffFunction;
        this.MAX_RETRIES = maxRetries;
        this.delayAmt = initDelay;

        this.i = 0;
        //this.serviceSucceeded = false;

        this.beginTime = Date.now();
    }

    run() {
        this.retry()
            .then(() => {
                return true;
            })
            .catch(() => {
                return false;
            });
    }

    retry() {
        var _this = this;
        return new Promise(async function(resolve, reject) {
            _this.service()
                .then(() => {
                    _this.elapsedTime = Date.now() - _this.beginTime;
                    console.log(_this.elapsedTime + ": SUCCESS");
                    resolve();
                })
                .catch(() => {
                    _this.elapsedTime = Date.now() - _this.beginTime;
                    console.log(_this.elapsedTime + ": FAILURE");
                });

            if (_this.i !== 0) {
                _this.delayAmt = _this.backoffFunction(_this.delayAmt);
            }
            _this.i++;
            if (_this.i >= _this.MAX_RETRIES) {
                reject();
            }

            await new Promise(function(resolve, reject) {
                setTimeout(() => {
                        _this.retry.bind(_this)()
                            .then(() => resolve())
                            .catch(() => reject())
                    },
                    _this.delayAmt
                );
            }).then(() => resolve()).catch(() => reject());
        });
    }
}
*/

module.exports = FunctionalBackoff;
