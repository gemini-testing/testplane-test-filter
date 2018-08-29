'use strict';

const {AsyncEmitter} = require('gemini-core').events;
const utils = require('../lib/utils');
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
        sandbox.stub(utils, 'readFile');
        sandbox.stub(console, 'warn');
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
            utils.readFile.withArgs('some/file.json').resolves([{
                fullTitle: 'some-title',
                browserId: 'some-browser'
            }]);

            const hermione = mkHermioneStub({isWorker: false});
            await initHermione(hermione, {inputFile: 'some/file.json'});

            const testCollection = mkTestCollectionStub();
            hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

            assert.calledOnce(testCollection.disableAll);
            assert.calledWith(testCollection.enableTest, 'some-title', 'some-browser');
        });

        it('should run all tests if input file is empty', async () => {
            utils.readFile.resolves([]);
            const hermione = mkHermioneStub({isWorker: false});
            await initHermione(hermione, {inputFile: 'some/path'});

            const testCollection = mkTestCollectionStub();
            hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

            assert.calledWithMatch(console.warn, 'Input file is empty. All tests will be run.');
            assert.notCalled(testCollection.disableAll);
        });
    });
});
