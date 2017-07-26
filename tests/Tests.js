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
        this.tests = [this.test0, this.test1, this.test2, this.test3];
        this.answers = [false, true, true, false];
    }

    async run() {
        for (var i = 0; i < this.tests.length; i++) {
            let test = this.tests[i].bind(this);
            console.log("TEST " + i + ":");
            try {
                let resolveVal = await test();
                console.log("RESOLVE: " + resolveVal);
                assert(resolveVal === this.answers[i])
            }
            catch(rejectVal) {
                console.log("REJECT: " + rejectVal);
                break;
            }
            console.log("");
        }

        if (i === this.tests.length) {
            console.log("ALL TESTS PASSED");
        }
    }

    test0() {
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
        ).run();
    }

    test1() {
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
        ).run();
    }

    test2() {
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
        ).run();
    }

    test3() {
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
        ).run();
    }
}

new Tests().run();
