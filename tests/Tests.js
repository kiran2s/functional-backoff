'use strict';

var Backoff = require('./../index.js').Backoff;

var maxRetriesExceptionMsg = "Maximum number of retries is not set to a positive value.";

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
                    (delayAmt => 2 * delayAmt),
                    100,
                    0,
                    200,
                    10000,
                    true
                ).run(sync);
            },
            answer: { resolves: false, results: maxRetriesExceptionMsg }
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
                    (delayAmt => 100 + delayAmt),
                    100,
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
                    (delayAmt => 0.5 * delayAmt),
                    1000,
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
                    (delayAmt => 2 * delayAmt),
                    100,
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
                    (delayAmt => delayAmt),
                    400,
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
                    (delayAmt => delayAmt),
                    400,
                    10,
                    null,
                    1200,
                    true
                ).run(sync);
            },
            answer: { resolves: true, results: "resolved" }
        };
    }
}

new Tests().run();
