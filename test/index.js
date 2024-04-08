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

    const mkTestCollectionStub = () => {
        return {
            disableAll: sandbox.stub(),
            enableTest: sandbox.stub()
        };
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
        it('should enable each test from input file', async () => {
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
