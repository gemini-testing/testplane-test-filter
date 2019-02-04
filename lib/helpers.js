'use strict';

const raiseUpTest = function(fullTitle, browserId) {
    if (browserId) {
        const idx = this._findTestIndex(fullTitle, browserId);

        if (idx !== -1) {
            const originalTest = this._originalSpecs[browserId][idx];
            const test = this._specs[browserId][idx];

            // _originalSpecs is touched for sync with _specs
            this._originalSpecs[browserId].splice(idx, 1);
            this._originalSpecs[browserId].unshift(originalTest);
            this._specs[browserId].splice(idx, 1);
            this._specs[browserId].unshift(test);
        }
    } else {
        this.getBrowsers().forEach((browserId) => raiseUpTest(fullTitle, browserId));
    }
};

exports.raiseUpTest = raiseUpTest;
