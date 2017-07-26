'use strict';

var FunctionalBackoff = require('./FunctionalBackoff');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Tests {
    constructor() {
        this.tests = [this.test1];
        this.initTime = Date.now();
        this.n = 0;
    }

    async run() {
        for (let i = 0; i < this.tests.length; i++) {
            let test = this.tests[i].bind(this);
            try {
                let resolveVal = await test();
                console.log("RESOLVE: " + resolveVal);
            }
            catch(rejectVal) {
                console.log("REJECT: " + rejectVal);
            }
        }
    }

    test1() {
        var _this = this;
        return new FunctionalBackoff(
            function() {
                return new Promise(async function(resolve, reject) {
                    console.log(Date.now() - _this.initTime + ": Service requested");
                    await sleep(1000);
                    if (_this.n === 5) {
                        _this.n = 0;
                        resolve();
                    }
                    else {
                        _this.n++;
                        reject();
                    }
                });
            },
            (delayAmt => 2 * delayAmt),
            100,
            10
        ).run();
    }
}

new Tests().run();
