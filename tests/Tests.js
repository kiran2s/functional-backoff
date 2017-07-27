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
        this.backoffMethods = [{sync: true, rec: null}, {sync: false, rec: true}, {sync: false, rec: false}];
        this.tests = [this.test0, this.test1, this.test2, this.test3, this.test4];
        this.answers = [false, true, true, false, true];
    }

    async run() {
        for (var i = 0; i < this.backoffMethods.length; i++) {
            let backoffMethod = this.backoffMethods[i];
            console.log("BACKOFF METHOD: sync = " + backoffMethod.sync + ", rec = " + backoffMethod.rec);
            console.log("");
            for (var j = 0; j < this.tests.length; j++) {
                let test = this.tests[j].bind(this);
                console.log("TEST " + j + ":");
                try {
                    let resolveVal = await test(backoffMethod.sync, backoffMethod.rec);
                    console.log("RESOLVE: " + resolveVal);
                    assert(resolveVal === this.answers[j])
                }
                catch(e) {
                    console.log("REJECT: " + e);
                    return;
                }
                console.log("");
            }
        }

        console.log("ALL TESTS PASSED");
    }

    test0(sync, rec) {
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
            true
        ).run(sync, rec);
    }

    test1(sync, rec) {
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
            (delayAmt => 100 + delayAmt),
            100,
            10,
            true
        ).run(sync, rec);
    }

    test2(sync, rec) {
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
            (delayAmt => 0.5 * delayAmt),
            1000,
            6,
            true
        ).run(sync, rec);
    }

    test3(sync, rec) {
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
            5,
            true
        ).run(sync, rec);
    }

    test4(sync, rec) {
        let n = 0;
        let initTime = Date.now();
        return new FunctionalBackoff(
            function() {
                return new Promise(async function(resolve, reject) {
                    console.log(Date.now() - initTime + ": Service requested");
                    await sleep(5000);
                    if (n === 2) {
                        n = 0;
                        resolve();
                    }
                    else {
                        n++;
                        reject();
                    }
                });
            },
            (delayAmt => delayAmt),
            500,
            5,
            true
        ).run(sync, rec);
    }
}

new Tests().run();
