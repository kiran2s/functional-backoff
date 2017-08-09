'use strict';

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
var should = chai.should();

var Backoff = require('./../index.js').Backoff;
var LinearBackoff = require('./../index.js').LinearBackoff;
var ExponentialBackoff = require('./../index.js').ExponentialBackoff;
var FibonacciBackoff = require('./../index.js').FibonacciBackoff;

let debug = true;

function makeService(successItr = 5, sleepAmt = 100, resolveVal = "resolved", rejectVal = "rejected", callback = null) {
    let initTime = Date.now();
    let n = 0;
    return function() {
        let args = Array.from(arguments);
        let callNum = n++;
        return new Promise(async function(resolve, reject) {
            if (debug) {
                log("Service requested", initTime);
            }
            if (callback !== null) {
                resolveVal = rejectVal = callback(...args);
            }

            if (typeof sleepAmt === "function") {
                let amt = sleepAmt();
                await sleep(amt);
                log("Service delta time: " + amt, initTime);
            }
            else {
                await sleep(sleepAmt);
                log("Service delta time: " + sleepAmt, initTime);
            }
            if (callNum === successItr) {
                resolve(callNum + ": " + resolveVal);
            }
            else {
                reject(callNum + ": " + rejectVal);
            }
        });
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg, initTime) {
    console.log(Date.now() - initTime + ": " + msg);
}

describe('Backoff', function() {
    describe('#runSync()', function() {
        it('should resolve in ~850ms when success achieved before retry limit reached', function() {
            this.timeout(2000);
            this.slow(950);
            let backoff = new Backoff(makeService())
                .setInitialDelay(50)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved");
        });

        it('should reject quickly when service not provided', function() {
            this.timeout(1000);
            this.slow(100);
            let backoff = new Backoff().setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith(Backoff.Reason.serviceNotSet);
        });

        it('should resolve quickly when service takes a short amount of time', function() {
            this.timeout(1000);
            this.slow(100);
            let backoff = new Backoff(makeService(5, 0))
                .setInitialDelay(0)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved");
        });

        it('should reject quickly when service takes a short amount of time', function() {
            this.timeout(1000);
            this.slow(100);
            let backoff = new Backoff(makeService(11, 0))
                .setInitialDelay(0)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("9: rejected");
        });

        it('should resolve in ~850ms when a service argument is provided', function() {
            this.timeout(2000);
            this.slow(950);
            let backoff = new Backoff(makeService(5, 100, "resolved", "rejected", function(arg) {
                return arg;
            })) .setServiceArgs(["42"])
                .setInitialDelay(50)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: 42");
        });

        it('should resolve in ~850ms when multiple service arguments are provided', function() {
            this.timeout(2000);
            this.slow(950);
            let backoff = new Backoff(makeService(5, 100, "resolved", "rejected", function() {
                let sum = 0;
                Array.from(arguments).map(function(val) { sum += val; });
                return sum.toString();
            })) .setServiceArgs([1, 2, 3, 4])
                .setInitialDelay(50)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: 10");
        });

        it('should resolve in ~850ms when different types of service arguments are provided', function() {
            this.timeout(2000);
            this.slow(950);
            let backoff = new Backoff(makeService(5, 100, "resolved", "rejected", function() {
                let args = Array.from(arguments);
                let sum = 0;
                Array.from(arguments).map(function(val) {
                    switch (typeof val) {
                        case "number":
                            sum += val;
                            break;
                        case "string":
                            sum += parseInt(val);
                            break;
                        case "function":
                            sum += val();
                            break;
                        case "object":
                            if (Array.isArray(val)) {
                                sum += val[0];
                            }
                            else {
                                sum += val.num;
                            }
                            break;
                    }
                });
                return sum.toString();
            })) .setServiceArgs([1, "2", (() => 3), [4], { num: 5 }])
                .setInitialDelay(50)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: 15");
        });

        it('should reject in ~100ms and never retry if retry condition always returns false', function() {
            this.timeout(1000);
            this.slow(120);
            let backoff = new Backoff(makeService())
                .setRetryCondition(function(reason) {
                    return false;
                })
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("0: rejected");
        });

        it('should reject in ~550ms and stop retrying when retry condition returns false', function() {
            this.timeout(1000);
            this.slow(600);
            let n = 0;
            let backoff = new Backoff(makeService())
                .setRetryCondition(function(reason) {
                    if (reason === "3: rejected") {
                        return false;
                    }
                    return true;
                })
                .setInitialDelay(50)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("3: rejected");
        });

        it('should resolve in ~1100ms with backoff delay amount growing linearly', function() {
            this.timeout(2000);
            this.slow(1200);
            let backoff = new Backoff(makeService(4))
                .setInitialDelay(0)
                .setNextDelay(delayAmt => delayAmt + 100)
                .setDebugMode(debug);
            return backoff.runSync().should.become("4: resolved");
        });

        it('should resolve in ~1330ms with backoff delay amount growing exponentially', function() {
            this.timeout(2000);
            this.slow(1420);
            let backoff = new Backoff(makeService(6))
                .setInitialDelay(10)
                .setNextDelay(delayAmt => delayAmt * 2)
                .setDebugMode(debug);
            return backoff.runSync().should.become("6: resolved");
        });

        it('should resolve in ~1330ms with backoff delay amount decreasing exponentially', function() {
            this.timeout(2000);
            this.slow(1420);
            let backoff = new Backoff(makeService(6))
                .setInitialDelay(320)
                .setNextDelay(delayAmt => delayAmt / 2)
                .setDebugMode(debug);
            return backoff.runSync().should.become("6: resolved");
        });

        it('should reject in ~850ms with specified backoff delay amounts', function() {
            this.timeout(2000);
            this.slow(920);
            let i = 0;
            let delays = [200, 50, 100];
            let backoff = new Backoff(makeService(10))
                .setInitialDelay(0)
                .setNextDelay(function(delayAmt) {
                    delayAmt = delays[i];
                    i++;
                    return delayAmt;
                })
                .setMaxRetries(5)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("4: rejected");
        });

        it('should reject quickly when max retry limit set to 0', function() {
            this.timeout(1000);
            this.slow(100);
            let backoff = new Backoff(makeService())
                .setMaxRetries(0)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith(Backoff.Reason.retryLimitReached);
        });

        it('should reject in ~100ms when max retry limit set to 1', function() {
            this.timeout(1000);
            this.slow(150);
            let backoff = new Backoff(makeService())
                .setMaxRetries(1)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("0: rejected");
        });

        it('should resolve in ~100ms when success occurs on first attempt and max retry limit set to 1', function() {
            this.timeout(1000);
            this.slow(150);
            let backoff = new Backoff(makeService(0))
                .setMaxRetries(1)
                .setDebugMode(debug);
            return backoff.runSync().should.become("0: resolved");
        });

        it('should resolve in ~1100ms when success occurs on last allowed retry', function() {
            this.timeout(2000);
            this.slow(1200);
            let backoff = new Backoff(makeService())
                .setMaxRetries(6)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved");
        });

        it('should reject in ~900ms when success were to occur after last allowed retry', function() {
            this.timeout(2000);
            this.slow(1000);
            let backoff = new Backoff(makeService())
                .setMaxRetries(5)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("4: rejected");
        });

        it('should resolve in ~600ms when max delay set to 0', function() {
            this.timeout(2000);
            this.slow(700);
            let backoff = new Backoff(makeService())
                .setMaxDelay(0)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved");
        });

        it('should resolve in ~600ms when max delay set to a negative number', function() {
            this.timeout(2000);
            this.slow(700);
            let backoff = new Backoff(makeService())
                .setMaxDelay(-137)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved");
        });

        it('should resolve in ~1050ms when max delay prevents endless exponential growth', function() {
            this.timeout(2000);
            this.slow(1150);
            let backoff = new Backoff(makeService(6))
                .setInitialDelay(10)
                .setNextDelay(delayAmt => delayAmt * 2)
                .setMaxDelay(100)
                .setDebugMode(debug);
            return backoff.runSync().should.become("6: resolved");
        });

        it('should reject in ~900ms when synchronous service timeout set to 0 and service takes a long time', function() {
            this.timeout(2000);
            this.slow(1000);
            let backoff = new Backoff(makeService(5, 1000))
                .setSyncTimeout(0)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith(Backoff.Reason.retryLimitReached);
        });

        it('should resolve in ~1100ms and never timeout when synchronous service timeout set to a very large number', function() {
            this.timeout(2000);
            this.slow(1200);
            let backoff = new Backoff(makeService())
                .setSyncTimeout(10000)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved");
        });

        it('should resolve in ~1300ms when service delta time initially too large but eventually decreases below timeout', function() {
            this.timeout(2000);
            this.slow(1400);

            let delayAmtGenerator = function*(delayAmt, offset) {
                for (;;) {
                    yield delayAmt;
                    delayAmt += offset;
                }
            }(400, -100);

            let getDelayAmt = function() {
                return delayAmtGenerator.next().value;
            };

            let backoff = new Backoff(makeService(5, getDelayAmt))
                .setSyncTimeout(250)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved");
        });

        it('should reject in ~1200ms when service delta time initially below timeout but eventually increases above timeout', function() {
            this.timeout(2000);
            this.slow(1300);

            let delayAmtGenerator = function*(delayAmt, offset) {
                for (;;) {
                    yield delayAmt;
                    delayAmt += offset;
                }
            }(0, 100);

            let getDelayAmt = function() {
                return delayAmtGenerator.next().value;
            };

            let backoff = new Backoff(makeService(5, getDelayAmt))
                .setMaxRetries(5)
                .setSyncTimeout(250)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith(Backoff.Reason.retryLimitReached);
        });

        it('should resolve in ~1100ms when service resolves to a non-string value', function() {
            this.timeout(2000);
            this.slow(1200);

            let initTime = Date.now();
            let n = 0;
            let service = function() {
                let callNum = n++;
                return new Promise(async function(resolve, reject) {
                    if (debug) {
                        log("Service requested", initTime);
                    }

                    await sleep(100);
                    log("Service delta time: " + 100, initTime);
                    if (callNum === 5) {
                        resolve(callNum);
                    }
                    else {
                        reject("rejected");
                    }
                });
            };

            let backoff = new Backoff(service)
                .setDebugMode(debug);
            return backoff.runSync().should.become(5);
        });
    });
});
