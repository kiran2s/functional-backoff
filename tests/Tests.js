'use strict';

var FunctionalBackoff = require('./../src/FunctionalBackoff');

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
                    assert(resolveVal === testCase.answer)
                }
                catch(e) {
                    console.log("REJECT: " + e);
                    return;
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
                let n = 0;
                let initTime = Date.now();
                return new FunctionalBackoff(
                    function() {
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(1000);
                            if (n === 5) {
                                n = 0;
                                resolve();
                            }
                            else {
                                n++;
                                reject();
                            }
                        });
                    },
                    (delayAmt => 2 * delayAmt),
                    100,
                    0,
                    10000,
                    true
                ).run(sync);
            },
            answer: false
        };
    }

    testCase1() {
        return {
            name: "TEST 1",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new FunctionalBackoff(
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
                    (delayAmt => 100 + delayAmt),
                    100,
                    10,
                    10000,
                    true
                ).run(sync);
            },
            answer: true
        };
    }

    testCase2() {
        return {
            name: "TEST 2",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new FunctionalBackoff(
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
                    (delayAmt => 0.5 * delayAmt),
                    1000,
                    6,
                    10000,
                    true
                ).run(sync);
            },
            answer: true
        };
    }

    testCase3() {
        return {
            name: "TEST 3",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new FunctionalBackoff(
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
                    (delayAmt => 2 * delayAmt),
                    100,
                    5,
                    10000,
                    true
                ).run(sync);
            },
            answer: false
        }
    }

    testCase4() {
        return {
            name: "TEST 4",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                return new FunctionalBackoff(
                    function() {
                        let callNum = n++;
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(4000);
                            if (callNum === 2) {
                                resolve();
                            }
                            else {
                                reject();
                            }
                        });
                    },
                    (delayAmt => delayAmt),
                    400,
                    5,
                    10000,
                    true
                ).run(sync);
            },
            answer: true
        };
    }

    testCase5() {
        return {
            name: "TEST 5",
            test: function(sync) {
                let initTime = Date.now();
                let n = 0;
                let sleepAmt = 5000;
                return new FunctionalBackoff(
                    function() {
                        let callNum = n++;
                        if (sleepAmt >= 1000) {
                            sleepAmt -= 1000;
                        }
                        return new Promise(async function(resolve, reject) {
                            console.log(Date.now() - initTime + ": Service requested");
                            await sleep(sleepAmt);
                            if (callNum === 2) {
                                resolve();
                            }
                            else {
                                reject();
                            }
                        });
                    },
                    (delayAmt => delayAmt),
                    400,
                    10,
                    1200,
                    true
                ).run(sync);
            },
            answer: true
        };
    }
}

new Tests().run();
