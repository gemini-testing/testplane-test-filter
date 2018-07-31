'use strict';

const {AsyncEmitter} = require('gemini-core').events;
const globExtra = require('glob-extra');
const fs = require('fs-extra');
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
        sandbox.stub(console, 'info');
        sandbox.stub(console, 'warn');
        sandbox.stub(globExtra, 'expandPaths');
        sandbox.stub(fs, 'readJson');
    });

    afterEach(() => sandbox.restore());

    describe('in worker process of hermione', () => {
        it('should do nothing', async () => {
            const hermione = mkHermioneStub({isWorker: true});
            sandbox.spy(hermione, 'on');
            await initHermione(hermione, {reportsPath: 'some/path'});

            assert.notCalled(hermione.on);
        });
    });

    describe('in master process of hermione', () => {
        it('should enable each test from reports', async () => {
            globExtra.expandPaths.withArgs('some/path').resolves(['some/file1.json', 'other/file2.json']);
            fs.readJson.withArgs('some/file1.json').resolves([{
                title: 'some-title',
                browser: 'some-browser'
            }]);
            fs.readJson.withArgs('other/file2.json').resolves([{
                title: 'other-title',
                browser: 'other-browser'
            }]);
            const hermione = mkHermioneStub({isWorker: false});
            await initHermione(hermione, {reportsPath: 'some/path'});

            const testCollection = mkTestCollectionStub();
            hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

            assert.calledOnce(testCollection.disableAll);
            assert.calledTwice(testCollection.enableTest);
            assert.calledWith(testCollection.enableTest, 'some-title', 'some-browser');
            assert.calledWith(testCollection.enableTest, 'other-title', 'other-browser');
        });

        it('should run all tests if reports are not found', async () => {
            globExtra.expandPaths.withArgs('some/path').resolves([]);

            const hermione = mkHermioneStub({isWorker: false});
            await initHermione(hermione, {reportsPath: 'some/path'});

            const testCollection = mkTestCollectionStub();
            hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

            assert.notCalled(testCollection.disableAll);
        });
    });
});
