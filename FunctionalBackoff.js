'use strict';

var beginTime = Date.now();

class FunctionalBackoff {
    constructor(servicePromise, backoffFunction, maxRetries, initTimeBetweenCalls) {
        this.servicePromise = servicePromise;
        this.backoffFunction = backoffFunction;
        this.MAX_RETRIES = maxRetries;
        this.delayAmt = initTimeBetweenCalls;

        this.i = 0;
        this.serviceSucceeded = false; 
    }

    run() {
        return this.retry();
    }

    retry() {
        if (this.i >= this.MAX_RETRIES || this.serviceSucceeded === true) {
            return;
        }

        this.servicePromise()
            .then(() => {
                console.log("yup");
                this.serviceSucceeded = true;
            })
            .catch(() => {
                console.log("nope");
            });

        if (this.i !== 0) {
            this.delayAmt = this.backoffFunction(this.delayAmt);
        }
        this.i++;
        setTimeout(this.retry.bind(this), this.delayAmt);
    }
}

/*
class FunctionalBackoff {
    constructor(servicePromise, backoffFunction, maxRetries, initTimeBetweenCalls) {
        this.servicePromise = servicePromise;
        this.backoffFunction = backoffFunction;
        this.MAX_RETRIES = maxRetries;
        this.delayAmt = initTimeBetweenCalls;

        this.i = 0;
        this.serviceSucceeded = false;
    }

    run() {
        this.retry()
            .then(() => {
                console.log("true");
                return true;
            })
            .catch(() => {
                console.log("false");
                return false;
            });
    }

    retry() {
        var _this = this;
        return new Promise(async function(resolve, reject) {
            if (_this.i >= _this.MAX_RETRIES) {
                reject();
            }
            else if (_this.serviceSucceeded === true) {
                resolve();
            }

            _this.servicePromise()
                .then(() => {
                    let elapsedTime = Date.now() - beginTime;
                    console.log(elapsedTime);
                    _this.serviceSucceeded = true;
                })
                .catch(() => {
                    let elapsedTime = Date.now() - beginTime;
                    console.log(elapsedTime);
                });
            
            if (_this.i !== 0) {
                _this.delayAmt = _this.backoffFunction(_this.delayAmt);
            }
            _this.i++;
            await new Promise(resolve => setTimeout(
                () => {
                    _this.retry()
                        .then(() => {
                            resolve();
                        })
                        .catch(() => {
                            reject();
                        });
                },
                _this.delayAmt
            ));
        });
    }
}
*/

module.exports = FunctionalBackoff;
