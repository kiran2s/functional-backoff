'use strict';

var Backoff = require('./../index.js').Backoff;
var LinearBackoff = require('./../index.js').LinearBackoff;
var ExponentialBackoff = require('./../index.js').ExponentialBackoff;
var FibonacciBackoff = require('./../index.js').FibonacciBackoff;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition) {
    if (condition === false) {
        throw "Test case failed";
    }
}

class Tests {
    constructor() {
        this.backoffMethods = [{sync: true}, {sync: false}];
        this.testCases = [];

        let propertyNames = Object.getOwnPropertyNames(Tests.prototype);
        for (let i = 0; i < propertyNames.length; i++) {
            let propertyName = propertyNames[i];
            let match = propertyName.match(/^testCase\d+$/);
            if (match !== null) {
                this.testCases.push(this[propertyName]);
            }
        }
    }

    async run() {
        for (let i = 0; i < this.backoffMethods.length; i++) {
            let backoffMethod = this.backoffMethods[i];
            console.log("BACKOFF METHOD: sync = " + backoffMethod.sync);
            console.log("");
            
            for (let j = 0; j < this.testCases.length; j++) {
                let testCase = this.testCases[j]();
                console.log(testCase.name + ":");
                try {
                    let resolveVal = await testCase.test(backoffMethod.sync);
                    console.log("RESOLVE: " + resolveVal);
                    assert(testCase.answer.resolves === true && testCase.answer.results === resolveVal);
                }
                catch(e) {
                    console.log("REJECT: " + e);
                    assert(testCase.answer.resolves === false && testCase.answer.results === e);
                }
                console.log("");
            }
        }

        console.log("*** ALL TESTS PASSED ***");
    }

    testCase0() {
        return {
            name: "TEST 0",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new Backoff(
                    function() {
                        let callNum = n++;
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(1000);
                            if (callNum === 5) {
                                resolve();
                            }
                            else {
                                reject();
                            }
                        });
                    },
                    null,
                    null,
                    100,
                    (delayAmt => 2 * delayAmt),
                    0,
                    200,
                    10000,
                    true
                ).run(sync);
            },
            answer: { resolves: false, results: Backoff.Reason.retryLimitReached }
        };
    }

    testCase1() {
        return {
            name: "TEST 1",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new Backoff(
                    function() {
                        let callNum = n++;
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(1000);
                            if (callNum === 5) {
                                resolve("resolved");
                            }
                            else {
                                reject("rejected");
                            }
                        });
                    },
                    null,
                    null,
                    100,
                    (delayAmt => 100 + delayAmt),
                    10,
                    null,
                    10000,
                    true
                ).run(sync);
            },
            answer: { resolves: true, results: "resolved" }
        };
    }

    testCase2() {
        return {
            name: "TEST 2",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new Backoff(
                    function() {
                        let callNum = n++;
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(1000);
                            if (callNum === 5) {
                                resolve(1);
                            }
                            else {
                                reject(2);
                            }
                        });
                    },
                    null,
                    null,
                    1000,
                    (delayAmt => 0.5 * delayAmt),
                    6,
                    null,
                    10000,
                    true
                ).run(sync);
            },
            answer: { resolves: true, results: 1 }
        };
    }

    testCase3() {
        return {
            name: "TEST 3",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new Backoff(
                    function() {
                        let callNum = n++;
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(1000);
                            if (callNum === 5) {
                                resolve("resolved");
                            }
                            else {
                                reject("rejected");
                            }
                        });
                    },
                    null,
                    null,
                    100,
                    (delayAmt => 2 * delayAmt),
                    5,
                    null,
                    10000,
                    true
                ).run(sync);
            },
            answer: { resolves: false, results: "rejected" }
        }
    }

    testCase4() {
        return {
            name: "TEST 4",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new Backoff(
                    function(arg) {
                        let callNum = n++;
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested (" + arg + ")");
                            await sleep(4000);
                            if (callNum === 2) {
                                resolve("resolved");
                            }
                            else {
                                reject("rejected");
                            }
                        });
                    },
                    [42],
                    null,
                    400,
                    (delayAmt => delayAmt),
                    5,
                    null,
                    10000,
                    true
                ).run(sync);
            },
            answer: { resolves: true, results: "resolved" }
        };
    }

    testCase5() {
        return {
            name: "TEST 5",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                let sleepAmt = 5000;
                return new Backoff(
                    function() {
                        let callNum = n++;
                        if (sleepAmt >= 1000) {
                            sleepAmt -= 1000;
                        }
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(sleepAmt);
                            if (callNum === 2) {
                                resolve("resolved");
                            }
                            else {
                                reject("rejected");
                            }
                        });
                    },
                    null,
                    null,
                    400,
                    (delayAmt => delayAmt),
                    10,
                    null,
                    1200,
                    true
                ).run(sync);
            },
            answer: { resolves: true, results: "resolved" }
        };
    }

    testCase6() {
        return {
            name: "TEST 6",
            test: function(sync) {
                let initTime = Date.now();
                let delayIndex = 0;
                let delays = [50, 100, 200];
                return new Backoff(
                    function() {
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(1000);
                            reject();
                        });
                    },
                    [],
                    null,
                    0,
                    function(delayAmt) {
                        let delay = delays[delayIndex];
                        delayIndex++;
                        return delay;
                    },
                    5,
                    Infinity,
                    50,
                    true
                ).runSync();
            },
            answer: { resolves: false, results: Backoff.Reason.retryLimitReached }
        };
    }
}

new Tests().run();
