'use strict';

const _ = require('lodash');
const {raiseUpTest} = require('../lib/helpers');

describe('helpers', () => {
    const specs = {
        'some-browser': [
            {title: 'some-title'},
            {title: 'some-title-2'},
            {title: 'some-title-3'}
        ],
        'some-browser-2': [
            {title: 'some-title'},
            {title: 'some-title-2'},
            {title: 'some-title-3'}
        ]
    };

    const mkTestCollectionStub = () => {
        return {
            _findTestIndex(fullTitle, browserId) {
                return this._specs[browserId].findIndex((test) => test.title === fullTitle);
            },
            _originalSpecs: _.cloneDeep(specs),
            _specs: _.cloneDeep(specs)
        };
    };

    describe('raiseUpTest', () => {
        it('should raise up test', async () => {
            const test = {fullTitle: 'some-title-3', browserId: 'some-browser'};
            const expectedSpecs = {
                'some-browser': [
                    {title: 'some-title-3'},
                    {title: 'some-title'},
                    {title: 'some-title-2'}
                ],
                'some-browser-2': specs['some-browser-2']
            };
            const testCollection = mkTestCollectionStub();

            raiseUpTest.call(testCollection, test.fullTitle, test.browserId);

            assert.deepEqual(testCollection._originalSpecs, expectedSpecs);
            assert.deepEqual(testCollection._specs, expectedSpecs);
        });
    });
});
