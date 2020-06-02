'use strict';

const _ = require('lodash');
const crypto = require('crypto');

class TestCodeCollection {
    constructor(collection = {}) {
        this._collection = collection;
    }

    add(runnable) {
        if (runnable.type === 'hook') {
            const runnableId = this._getRunnableId(runnable.parent.fullTitle(), runnable.parent.file);
            const hookType = runnable.title.includes('before') ? 'beforeEach' : 'afterEach';

            _.defaultsDeep(this._collection, {[runnableId]: {beforeEach: [], afterEach: []} });
            this._collection[runnableId][hookType].push(runnable);
        } else {
            const runnableId = this._getRunnableId(runnable.fullTitle(), runnable.file);

            _.defaultsDeep(this._collection, {[runnableId]: {}});
            this._collection[runnableId].test = runnable;
        }
    }

    getTestCode(fullTitle, filePath) {
        const item = this._getItem(fullTitle, filePath);

        if (!item) {
            return '';
        }

        const testCode = this._getRunnableCode(item.test);
        const {beforeEachCode, afterEachCode} = this._getHookStackCode(item.test.parent);

        return [beforeEachCode, testCode, afterEachCode].filter(Boolean).join('\n');
    }

    _getItem(fullTitle, filePath) {
        const runnableId = this._getRunnableId(fullTitle, filePath);

        return this._collection[runnableId];
    }

    _getHookStackCode(suite, acc = {beforeEachCode: '', afterEachCode: ''}) {
        const item = this._getItem(suite.fullTitle(), suite.file);

        if (item) {
            const {beforeEach = [], afterEach = []} = item;

            const beforeEachCode = beforeEach.map(this._getRunnableCode).join('\n');
            const afterEachCode = afterEach.map(this._getRunnableCode).join('\n');

            acc.beforeEachCode = [beforeEachCode, acc.beforeEachCode].filter(Boolean).join('\n');
            acc.afterEachCode = [acc.afterEachCode, afterEachCode].filter(Boolean).join('\n');
        }

        if (suite.root || !suite.parent) {
            return acc;
        }

        return this._getHookStackCode(suite.parent, acc);
    }

    _getRunnableId(fullTitle, filePath) {
        const str = fullTitle + ' ' + filePath;

        return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
    }

    _getRunnableCode(runnable) {
        return runnable.body || (runnable.fn || '').toString() || '';
    }
}

module.exports = TestCodeCollection;
