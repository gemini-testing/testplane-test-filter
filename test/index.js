'use strict';

const {AsyncEmitter} = require('gemini-core').events;
const fs = require('fs');
const plugin = require('../lib');

describe('test filter', () => {
    const sandbox = sinon.createSandbox();

    const mkHermioneStub = (opts = {}) => {
        const hermione = new AsyncEmitter();

        hermione.events = {
            INIT: 'init',
            AFTER_TESTS_READ: 'after_tests_read'
        };

        hermione.isWorker = () => opts.isWorker;

        return hermione;
    };

    const mkTestCollectionStub = () => {
        return {
            disableAll: sandbox.stub(),
            enableTest: sandbox.stub()
        };
    };

    const initHermione = async (hermione, opts = {}) => {
        plugin(hermione, {enabled: true, ...opts});

        await hermione.emitAndWait(hermione.events.INIT);
    };

    beforeEach(() => {
        sandbox.stub(fs, 'readFile');
        sandbox.stub(console, 'warn');
        sandbox.stub(console, 'info');
    });

    afterEach(() => sandbox.restore());

    describe('in worker process of hermione', () => {
        it('should do nothing', async () => {
            const hermione = mkHermioneStub({isWorker: true});
            sandbox.spy(hermione, 'on');
            await initHermione(hermione, {inputFile: 'some/file.json'});

            assert.notCalled(hermione.on);
        });
    });

    describe('in master process of hermione', () => {
        it('should enable each test from input file', async () => {
            fs.readFile.withArgs('some/file.json').yields(null, JSON.stringify([{
                fullTitle: 'some-title',
                browserId: 'some-browser'
            }]));

            const hermione = mkHermioneStub({isWorker: false});
            await initHermione(hermione, {inputFile: 'some/file.json'});

            const testCollection = mkTestCollectionStub();
            hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

            assert.calledOnce(testCollection.disableAll);
            assert.calledWith(testCollection.enableTest, 'some-title', 'some-browser');
        });

        it('should run all tests if input file is empty', async () => {
            fs.readFile.yields(null, '[]');
            const hermione = mkHermioneStub({isWorker: false});
            await initHermione(hermione, {inputFile: 'some/path'});

            const testCollection = mkTestCollectionStub();
            hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

            assert.calledWithMatch(console.warn, 'Input file is empty. All tests will be run.');
            assert.notCalled(testCollection.disableAll);
        });

        it('should notice that specific tests will be run', async () => {
            fs.readFile.withArgs('some/file.json').yields(null, JSON.stringify(["some tests"]));

            const hermione = mkHermioneStub({isWorker: false});
            await initHermione(hermione, {inputFile: 'some/file.json'});

            hermione.emit(hermione.events.AFTER_TESTS_READ, mkTestCollectionStub());

            assert.calledWithMatch(console.info, 'Data for tests filtering found. Specific tests will be run.');
        });
    });
});
