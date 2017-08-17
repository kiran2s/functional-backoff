'use strict';

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
var should = chai.should();

var Backoff = require('./../index.js').Backoff;
var LinearBackoff = require('./../index.js').LinearBackoff;
var ExponentialBackoff = require('./../index.js').ExponentialBackoff;
var FibonacciBackoff = require('./../index.js').FibonacciBackoff;

let debug = false;

function makeService(successItr = 5, deltaTime = 100, resolveVal = "resolved", rejectVal = "rejected", callback = null) {
    let initTime = Date.now();
    let n = 0;
    return function() {
        let args = Array.from(arguments);
        let callNum = n++;
        return new Promise(async function(resolve, reject) {
            log("Service requested", initTime);
            if (callback !== null) {
                resolveVal = rejectVal = callback(...args);
            }

            if (typeof deltaTime === "function") {
                let amt = deltaTime();
                await sleep(amt);
                log("Service delta time: " + amt, initTime);
            }
            else {
                await sleep(deltaTime);
                log("Service delta time: " + deltaTime, initTime);
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
    if (debug) {
        console.log(Date.now() - initTime + ": " + msg);
    }
}

var tests = [
    function(sync) {
        let expectedTime = sync ? 850 : 350;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when success achieved before retry limit reached';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService())
                .setInitialDelay(50)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: resolved");
        });
    },
    function(sync) {
        let explanation = 'should reject quickly when service not provided';
        it(explanation, function() {
            this.timeout(1000);
            this.slow(100);
            let backoff = new Backoff().setDebugMode(debug);
            return backoff.run(sync).should.be.rejectedWith(Backoff.Reason.serviceNotSet);
        });
    },
    function(sync) {
        let explanation = 'should resolve quickly when service is short and eventually succeeds';
        it(explanation, function() {
            this.timeout(1000);
            this.slow(100);
            let backoff = new Backoff(makeService(5, 0))
                .setInitialDelay(0)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: resolved");
        });
    },
    function(sync) {
        let explanation = 'should reject quickly when service is short and never succeeds';
        it(explanation, function() {
            this.timeout(1000);
            this.slow(100);
            let backoff = new Backoff(makeService(11, 0))
                .setInitialDelay(0)
                .setDebugMode(debug);
            return backoff.run(sync).should.be.rejectedWith("9: rejected");
        });
    },
    function(sync) {
        let expectedTime = sync ? 850 : 350;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when a service argument is provided';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService(5, 100, "resolved", "rejected", function(arg) {
                return arg;
            })) .setServiceArgs(["42"])
                .setInitialDelay(50)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: 42");
        });
    },
    function(sync) {
        let expectedTime = sync ? 850 : 350;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when multiple service arguments are provided';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService(5, 100, "resolved", "rejected", function() {
                let sum = 0;
                Array.from(arguments).map(function(val) { sum += val; });
                return sum.toString();
            })) .setServiceArgs([1, 2, 3, 4])
                .setInitialDelay(50)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: 10");
        });
    },
    function(sync) {
        let expectedTime = sync ? 850 : 350;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when different types of service arguments are provided';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
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
            return backoff.run(sync).should.become("5: 15");
        });
    },
    function(sync) {
        let explanation = 'should reject in ~100ms and never retry if retry condition always returns false';
        it(explanation, function() {
            this.timeout(1000);
            this.slow(120);
            let backoff = new Backoff(makeService())
                .setRetryCondition(function(reason) {
                    return false;
                })
                .setDebugMode(debug);
            return backoff.run(sync).should.be.rejectedWith("0: rejected");
        });
    },
    function(sync) {
        let expectedTime = sync ? 550 : 250;
        let explanation = 'should reject in ~' + expectedTime + 'ms and stop retrying when retry condition returns false';
        it(explanation, function() {
            this.timeout(1000);
            this.slow(expectedTime + 100);
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
            return backoff.run(sync).should.be.rejectedWith("3: rejected");
        });
    },
    function(sync) {
        let expectedTime = sync ? 1100 : 700;
        let explanation = 'should resolve in ~' + expectedTime + 'ms with backoff delay amount growing linearly';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService(4))
                .setInitialDelay(0)
                .setNextDelay(delayAmt => delayAmt + 100)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("4: resolved");
        });
    },
    function(sync) {
        let expectedTime = sync ? 1330 : 730;
        let explanation = 'should resolve in ~' + expectedTime + 'ms with backoff delay amount growing exponentially';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService(6))
                .setInitialDelay(10)
                .setNextDelay(delayAmt => delayAmt * 2)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("6: resolved");
        });
    },
    function(sync) {
        let expectedTime = sync ? 1330 : 730;
        let explanation = 'should resolve in ~' + expectedTime + 'ms with backoff delay amount decreasing exponentially';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService(6))
                .setInitialDelay(320)
                .setNextDelay(delayAmt => delayAmt / 2)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("6: resolved");
        });
    },
    function(sync) {
        let expectedTime = sync ? 850 : 450;
        let explanation = 'should reject in ~' + expectedTime + 'ms with specified backoff delay amounts';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
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
            return backoff.run(sync).should.be.rejectedWith("4: rejected");
        });
    },
    function(sync) {
        let explanation = 'should reject quickly when max retry limit set to 0';
        it(explanation, function() {
            this.timeout(1000);
            this.slow(100);
            let backoff = new Backoff(makeService())
                .setMaxRetries(0)
                .setDebugMode(debug);
            return backoff.run(sync).should.be.rejectedWith(Backoff.Reason.retryLimitReached);
        });
    },
    function(sync) {
        let explanation = 'should reject in ~100ms when max retry limit set to 1';
        it(explanation, function() {
            this.timeout(1000);
            this.slow(150);
            let backoff = new Backoff(makeService())
                .setMaxRetries(1)
                .setDebugMode(debug);
            return backoff.run(sync).should.be.rejectedWith("0: rejected");
        });
    },
    function(sync) {
        let explanation = 'should resolve in ~100ms when success occurs on first attempt and max retry limit set to 1';
        it(explanation, function() {
            this.timeout(1000);
            this.slow(150);
            let backoff = new Backoff(makeService(0))
                .setMaxRetries(1)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("0: resolved");
        });
    },
    function(sync) {
        let expectedTime = sync ? 1100 : 600;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when success occurs on last allowed retry';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService())
                .setMaxRetries(6)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: resolved");
        });
    },
    function(sync) {
        let expectedTime = sync ? 900 : 500;
        let explanation = 'should reject in ~' + expectedTime + 'ms when success were to occur right after last allowed retry';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService())
                .setMaxRetries(5)
                .setDebugMode(debug);
            return backoff.run(sync).should.be.rejectedWith("4: rejected");
        });
    },
    function(sync) {
        let expectedTime = sync ? 600 : 100;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when max delay set to 0';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService())
                .setMaxDelay(0)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: resolved");
        });
    },
    function(sync) {
        let expectedTime = sync ? 600 : 100;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when max delay set to a negative number';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService())
                .setMaxDelay(-137)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: resolved");
        });
    },
    function(sync) {
        let expectedTime = sync ? 1050 : 450;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when max delay prevents endless exponential growth';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService(6))
                .setInitialDelay(10)
                .setNextDelay(delayAmt => delayAmt * 2)
                .setMaxDelay(100)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("6: resolved");
        });
    },
    function(sync) {
        let expectedTime = sync ? 900 : 1500;
        let explanation = sync ? 
            'should reject in ~' + expectedTime + 'ms when service timeout set to 0 and service takes long time' :
            'should reject quickly when service timeout set to 0 and service takes long time';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService(5, 1000))
                .setServiceTimeout(0)
                .setDebugMode(debug);
            if (sync) {
                return backoff.run(sync).should.be.rejectedWith(Backoff.Reason.retryLimitReached);
            }
            else {
                return backoff.run(sync).should.be.rejectedWith(Backoff.Reason.timeout);
            }
        });
    },
    function(sync) {
        if (sync === false) {
            return (() => {});
        }
        let explanation = 'should resolve in ~1100ms and never timeout when service timeout set very high';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(1200);
            let backoff = new Backoff(makeService())
                .setServiceTimeout(10000)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: resolved");
        });
    },
    function(sync) {
        if (sync === false) {
            return (() => {});
        }
        let explanation = 'should resolve in ~1300ms when service delta time eventually decreases below timeout';
        it(explanation, function() {
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
                .setServiceTimeout(250)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: resolved");
        });
    },
    function(sync) {
        if (sync === false) {
            return (() => {});
        }
        let explanation = sync ? 'should reject in ~1200ms when service delta time eventually increases above timeout' : '';
        it(explanation, function() {
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
                .setServiceTimeout(250)
                .setDebugMode(debug);
            return backoff.run(sync).should.be.rejectedWith(Backoff.Reason.retryLimitReached);
        });
    },
    function(sync) {
        let expectedTime = sync ? 1100 : 600;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when service resolves to a non-string value';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);

            let initTime = Date.now();
            let n = 0;
            let service = function() {
                let callNum = n++;
                return new Promise(async function(resolve, reject) {
                    log("Service requested", initTime);
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
            return backoff.run(sync).should.become(5);
        });
    },
    function(sync) {
        if (sync === true) {
            return (() => {});
        }
        let expectedTime = 600;
        let explanation = 'should resolve in ~' + expectedTime + 'ms when success achieved before timeout';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService())
                .setInitialDelay(100)
                .setServiceTimeout(1000)
                .setDebugMode(debug);
            return backoff.run(sync).should.become("5: resolved");
        });
    },
    function(sync) {
        if (sync === true) {
            return (() => {});
        }
        let expectedTime = 500;
        let explanation = 'should reject in ~' + expectedTime + 'ms when timeout before success';
        it(explanation, function() {
            this.timeout(2000);
            this.slow(expectedTime + 100);
            let backoff = new Backoff(makeService())
                .setInitialDelay(100)
                .setServiceTimeout(500)
                .setDebugMode(debug);
            return backoff.run(sync).should.be.rejectedWith(Backoff.Reason.timeout);
        });
    }
];

describe('Backoff', function() {
    describe('#runSync()', function() {
        tests.forEach(function(test) {
            test(true);
        });
    });

    describe('#runAsync()', function() {
        tests.forEach(function(test) {
            test(false);
        });
    });
});

describe('LinearBackoff', function() {
    describe('#runSync()', function() {
        it('should resolve in ~1300ms when success achieved before retry limit reached', function() {
            this.timeout(2000);
            this.slow(1400);
            let backoff = new LinearBackoff(makeService())
                .setOffset(50)
                .setMod(3)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved")
        });

        it('should reject in ~1100ms when service never succeeds', function() {
            this.timeout(2000);
            this.slow(1200);
            let backoff = new LinearBackoff(makeService(20, 50))
                .setInitialDelay(0)
                .setOffset(50)
                .setMod(4)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("9: rejected")
        });
    });

    describe('#runAsync()', function() {
        it('should resolve in ~800ms when success achieved before retry limit reached', function() {
            this.timeout(2000);
            this.slow(900);
            let backoff = new LinearBackoff(makeService())
                .setOffset(50)
                .setMod(3)
                .setDebugMode(debug);
            return backoff.runAsync().should.become("5: resolved")
        });

        it('should reject in ~650ms when service never succeeds', function() {
            this.timeout(2000);
            this.slow(750);
            let backoff = new LinearBackoff(makeService(20, 50))
                .setInitialDelay(0)
                .setOffset(50)
                .setMod(4)
                .setDebugMode(debug);
            return backoff.runAsync().should.be.rejectedWith("9: rejected")
        });
    });
});

describe('ExponentialBackoff', function() {
    describe('#runSync()', function() {
        it('should resolve in ~850ms when success achieved before retry limit reached', function() {
            this.timeout(2000);
            this.slow(950);
            let backoff = new ExponentialBackoff(makeService())
                .setInitialDelay(25)
                .setFactor(2)
                .setMod(3)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved")
        });

        it('should reject in ~950ms when service never succeeds', function() {
            this.timeout(2000);
            this.slow(1050);
            let backoff = new ExponentialBackoff(makeService(20, 50))
                .setInitialDelay(25)
                .setFactor(2)
                .setMod(4)
                .setMaxRetries(8)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("7: rejected")
        });
    });

    describe('#runAsync()', function() {
        it('should resolve in ~350ms when success achieved before retry limit reached', function() {
            this.timeout(2000);
            this.slow(450);
            let backoff = new ExponentialBackoff(makeService())
                .setInitialDelay(25)
                .setFactor(2)
                .setMod(3)
                .setDebugMode(debug);
            return backoff.runAsync().should.become("5: resolved")
        });

        it('should reject in ~575ms when service never succeeds', function() {
            this.timeout(2000);
            this.slow(675);
            let backoff = new ExponentialBackoff(makeService(20, 50))
                .setInitialDelay(25)
                .setFactor(2)
                .setMod(4)
                .setMaxRetries(8)
                .setDebugMode(debug);
            return backoff.runAsync().should.be.rejectedWith("7: rejected")
        });
    });
});

describe('FibonacciBackoff', function() {
    describe('#runSync()', function() {
        it('should resolve in ~720ms when success achieved before retry limit reached', function() {
            this.timeout(2000);
            this.slow(820);
            let backoff = new FibonacciBackoff(makeService())
                .setInitialDelay(10)
                .setDebugMode(debug);
            return backoff.runSync().should.become("5: resolved")
        });

        it('should reject in ~730ms when service never succeeds', function() {
            this.timeout(2000);
            this.slow(830);
            let backoff = new FibonacciBackoff(makeService(20, 50))
                .setInitialDelay(10)
                .setMaxRetries(8)
                .setDebugMode(debug);
            return backoff.runSync().should.be.rejectedWith("7: rejected")
        });
    });

    describe('#runAsync()', function() {
        it('should resolve in ~220ms when success achieved before retry limit reached', function() {
            this.timeout(2000);
            this.slow(300);
            let backoff = new FibonacciBackoff(makeService())
                .setInitialDelay(10)
                .setDebugMode(debug);
            return backoff.runAsync().should.become("5: resolved")
        });

        it('should reject in ~380ms when service never succeeds', function() {
            this.timeout(2000);
            this.slow(480);
            let backoff = new FibonacciBackoff(makeService(20, 50))
                .setInitialDelay(10)
                .setMaxRetries(8)
                .setDebugMode(debug);
            return backoff.runAsync().should.be.rejectedWith("7: rejected")
        });
    });
});
