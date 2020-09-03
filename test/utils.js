'use strict';

const fs = require('fs');
const {readFile} = require('../lib/utils');

describe('utils', () => {
    describe('readFile', () => {
        const sandbox = sinon.createSandbox();

        beforeEach(() => {
            sandbox.stub(fs, 'readFileAsync');
            sandbox.stub(console, 'warn');
        });

        afterEach(() => sandbox.restore());

        describe('if file with data does not exist', () => {
            it('should not fail', async () => {
                fs.readFileAsync.withArgs('foo.json').rejects();

                await assert.isFulfilled(readFile('foo.json'));
            });

            it('should return an empty array', async () => {
                fs.readFileAsync.withArgs('foo.json').rejects();

                const data = await readFile('foo.json');

                assert.deepEqual(data, []);
            });
        });

        it('should fail if data from file can not be parsed', async () => {
            fs.readFileAsync.withArgs('foo.json').resolves('foo');

            await assert.isRejected(readFile('foo.json'));
        });

        it('should parse data from file', async () => {
            fs.readFileAsync.withArgs('foo.json').resolves('[]');
            sandbox.stub(JSON, 'parse');

            await readFile('foo.json');

            assert.calledWith(JSON.parse, '[]');
        });
    });
});
