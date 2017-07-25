'use strict';

var FunctionalBackoff = require('./FunctionalBackoff');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var beginTime = Date.now();
var n = 0;

new FunctionalBackoff(
    function() {
        return new Promise(function(resolve, reject) {
            let elapsedTime = Date.now() - beginTime;
            console.log("Service requested at: " + elapsedTime);
            if (n === 7) {
                resolve();
            }
            else {
                n++;
                reject();
            }
        });
    },
    (delayAmt => (2 * delayAmt)),
    10,
    100
).run();
