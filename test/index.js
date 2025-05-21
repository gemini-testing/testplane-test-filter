'use strict';

const utils = require('../lib/utils');
const plugin = require('../lib');
const EventEmitter2 = require('eventemitter2');

describe('test filter', () => {
    const sandbox = sinon.createSandbox();

    const mkTestplaneStub = (opts = {}) => {
        const testplane = new EventEmitter2();

        testplane.events = {
            INIT: 'init',
            AFTER_TESTS_READ: 'after_tests_read'
        };

        testplane.isWorker = () => opts.isWorker;

        return testplane;
    };

    const mkTestCollectionStub = (initialMockTests = []) => {
        const tests = [];
        const stub = {
            disableAll: sandbox.stub(),
            enableTest: sandbox.stub(),
            eachTest: (cb) => tests.forEach(cb)
        };

        initialMockTests.forEach(({ title, parentTitle }) => {
            const test = {
                title,
                fullTitle: () => (parentTitle ? `${parentTitle} ${title}` : title)
            };
            if (parentTitle) {
                test.parent = { title: parentTitle };
            }
            tests.push(test);
        });

        return stub;
    };

    const initTestplane = async (testplane, opts = {}) => {
        plugin(testplane, {enabled: true, ...opts});

        await testplane.emitAsync(testplane.events.INIT);
    };

    beforeEach(() => {
        sandbox.stub(utils, 'readFile');
        sandbox.stub(console, 'warn');
    });

    afterEach(() => sandbox.restore());

    describe('in worker process of testplane', () => {
        it('should do nothing', async () => {
            const testplane = mkTestplaneStub({isWorker: true});
            sandbox.spy(testplane, 'on');
            await initTestplane(testplane, {inputFile: 'some/file.json'});

            assert.notCalled(testplane.on);
        });
    });

    describe('in master process of testplane', () => {
        it('should enable each test from input file based on fullTitle', async () => {
            utils.readFile.withArgs('some/file.json').resolves([{
                fullTitle: 'some-title',
                browserId: 'some-browser'
            }]);

            const testplane = mkTestplaneStub({isWorker: false});
            await initTestplane(testplane, {inputFile: 'some/file.json'});

            const testCollection = mkTestCollectionStub();
            testplane.emit(testplane.events.AFTER_TESTS_READ, testCollection);

            assert.calledOnce(testCollection.disableAll);
            assert.calledWith(testCollection.enableTest, 'some-title', 'some-browser');
        });

        it('should enable tests based on suiteTitle', async () => {
            utils.readFile.resolves([
                {suiteTitle: 'suite1', browserId: 'br1'}
            ]);

            const testplane = mkTestplaneStub({isWorker: false});
            await initTestplane(testplane);

            const testCollection = mkTestCollectionStub([
                { title: 'test1', parentTitle: 'suite1' },
                { title: 'test2', parentTitle: 'suite1' },
                { title: 'test3', parentTitle: 'suite2' }
            ]);

            testplane.emit(testplane.events.AFTER_TESTS_READ, testCollection);

            assert.calledOnce(testCollection.disableAll);
            assert.calledWith(testCollection.enableTest, 'suite1 test1', 'br1');
            assert.calledWith(testCollection.enableTest, 'suite1 test2', 'br1');
            assert.neverCalledWith(testCollection.enableTest, 'suite2 test3', 'br1');
        });

        it('should enable tests based on title', async () => {
            utils.readFile.resolves([
                {title: 'test1', browserId: 'br1'}
            ]);

            const testplane = mkTestplaneStub({isWorker: false});
            await initTestplane(testplane);

            const testCollection = mkTestCollectionStub([
                { title: 'test1', parentTitle: 'suite1' },
                { title: 'test2', parentTitle: 'suite1' }
            ]);

            testplane.emit(testplane.events.AFTER_TESTS_READ, testCollection);

            assert.calledOnce(testCollection.disableAll);
            assert.calledWith(testCollection.enableTest, 'suite1 test1', 'br1');
            sinon.assert.neverCalledWith(testCollection.enableTest, 'suite1 test2', 'br1');
        });

        it('should prioritize fullTitle over suiteTitle and title', async () => {
            utils.readFile.resolves([
                {fullTitle: 'suite1 test1', suiteTitle: 'suite2', title: 'test3', browserId: 'br1'}
            ]);

            const testplane = mkTestplaneStub({isWorker: false});
            await initTestplane(testplane);

            const testCollection = mkTestCollectionStub([
                { title: 'test1', parentTitle: 'suite1' },
                { title: 'test2', parentTitle: 'suite2' },
                { title: 'test3', parentTitle: 'suite3' }
            ]);

            testplane.emit(testplane.events.AFTER_TESTS_READ, testCollection);

            assert.calledOnce(testCollection.disableAll);
            assert.calledWith(testCollection.enableTest, 'suite1 test1', 'br1');
            assert.neverCalledWith(testCollection.enableTest, sinon.match(/suite2/), 'br1');
            assert.neverCalledWith(testCollection.enableTest, sinon.match(/test3/), 'br1');
        });

        it('should prioritize suiteTitle over title if fullTitle is not present', async () => {
            utils.readFile.resolves([
                {suiteTitle: 'suite2', title: 'test1', browserId: 'br1'}
            ]);

            const testplane = mkTestplaneStub({isWorker: false});
            await initTestplane(testplane);

            const testCollection = mkTestCollectionStub([
                { title: 'test1', parentTitle: 'suite1' },
                { title: 'test1', parentTitle: 'suite2' },
                { title: 'test2', parentTitle: 'suite2' }
            ]);

            testplane.emit(testplane.events.AFTER_TESTS_READ, testCollection);

            assert.calledOnce(testCollection.disableAll);
            assert.calledWith(testCollection.enableTest, 'suite2 test1', 'br1');
            assert.calledWith(testCollection.enableTest, 'suite2 test2', 'br1');
            assert.neverCalledWith(testCollection.enableTest, 'suite1 test1', 'br1');
        });

        it('should run all tests if input file is empty', async () => {
            utils.readFile.resolves([]);
            const testplane = mkTestplaneStub({isWorker: false});
            await initTestplane(testplane, {inputFile: 'some/path'});

            const testCollection = mkTestCollectionStub();
            testplane.emit(testplane.events.AFTER_TESTS_READ, testCollection);

            assert.notCalled(testCollection.disableAll);
        });
    });
});
