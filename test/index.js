'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const {AsyncEmitter,EventEmmiter} = require('gemini-core').events;

const utils = require('../lib/utils');
const TestCodeCollection = require('../lib/test-code-collection');

describe('test filter', () => {
    const sandbox = sinon.createSandbox();

    const mkHermioneStub = (opts = {}) => {
        const hermione = new AsyncEmitter();

        hermione.events = {
            INIT: 'init',
            AFTER_TESTS_READ: 'after_tests_read',
            CLI: 'cli'
        };

        hermione.isWorker = () => opts.isWorker;

        return hermione;
    };

    const mkTestCollectionStub = (tests = []) => {
        return {
            eachTest: (fn) => tests.forEach(fn),
            disableAll: sandbox.stub(),
            disableTest: sandbox.stub(),
            enableTest: sandbox.stub()
        };
    };

    const mkTestParserStub = () => {
        const testParser = new AsyncEmitter();

        testParser.events = {HOOK: 'hook',TEST: 'test'};
        sandbox.spy(testParser, 'on');

        return testParser;
    };

    const mkTestCodeCollectionStub = (tests = []) => {
        sandbox.stub(TestCodeCollection.prototype, 'add');

        tests.reduce((stub, test) => {
            return stub.withArgs(test.fullTitle()).returns(test.body);
        }, sandbox.stub(TestCodeCollection.prototype, 'getTestCode'));

        return TestCodeCollection;
    };

    const initHermione = async (hermione, opts = {}, stubs = {}) => {
        const plugin = proxyquire('../lib', stubs);

        plugin(hermione, {enabled: true, ...opts});

        await hermione.emitAndWait(hermione.events.INIT);
    };

    beforeEach(() => {
        sandbox.stub(utils, 'readFile');
        sandbox.stub(console, 'warn');
    });

    afterEach(() => sandbox.restore());

    describe('in worker process of hermione', () => {
        it('should add one listener', async () => {
            const hermione = mkHermioneStub({isWorker: true});
            sandbox.spy(hermione, 'on');
            await initHermione(hermione, {inputFile: 'some/file.json'});

            assert.calledOnce(hermione.on);
            assert.calledWith(hermione.on, hermione.events.CLI);
        });
    });

    describe('in master process of hermione', () => {
        it('should run all tests if all options is empty', async () => {
            utils.readFile.resolves([]);
            const hermione = mkHermioneStub({isWorker: false});
            await initHermione(hermione, {inputFile: 'some/path'});

            const testCollection = mkTestCollectionStub();
            hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

            assert.notCalled(testCollection.disableAll);
            assert.notCalled(testCollection.disableTest);
        });

        describe('inputFile', () => {
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
        });

        describe('filterTestsByCode', () => {
            let hermione;
            let testParser;
            let testCollection;

            beforeEach(() => {
                hermione = mkHermioneStub({isWorker: false});
                testParser = mkTestParserStub();
            });

            it('should add listener to the parser', async () => {
                await initHermione(hermione, {filterTestsByCode: _.noop});

                hermione.emit(hermione.events.BEFORE_FILE_READ, {testParser});

                assert.calledWith(testParser.on, testParser.events.HOOK);
                assert.calledWith(testParser.on, testParser.events.TEST);
            });

            it('should add item to test code collection', async () => {
                const TestCodeCollection = mkTestCodeCollectionStub();

                await initHermione(hermione, {filterTestsByCode: _.noop}, {
                    './test-code-collection': TestCodeCollection
                });

                hermione.emit(hermione.events.BEFORE_FILE_READ, {testParser});
                testParser.emit(testParser.events.HOOK, {});

                assert.calledOnce(TestCodeCollection.prototype.add);
            });

            [
                {
                    code: 'browser.assertView()',
                    filter: 'assertView'
                },
                {
                    code: 'browser.assertView("s", "body")',
                    filter: /assertView\(.*body.*\)/m
                },
                {
                    code: 'browser.url("https://ya.ru").assertView("s", "body")',
                    filter: (value) => /http[s]?/m.test(value) && value.includes('assertView')
                }
            ]
                .forEach(({code, filter}) => {
                    const type = _.isRegExp(filter) ? 'regexp' : typeof filter;

                    it(`should disable each test not passed the filter with ${type} value`, async () => {
                        const tests = [
                            {fullTitle: () => '0', body: 'some-body'},
                            {fullTitle: () => '1', body: code},
                            {fullTitle: () => '2', body: 'some-code'}
                        ];

                        testCollection = mkTestCollectionStub(tests);

                        await initHermione(hermione, {filterTestsByCode: filter}, {
                            './test-code-collection': mkTestCodeCollectionStub(tests)
                        });
                        hermione.emit(hermione.events.BEFORE_FILE_READ, {testParser});
                        hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

                        assert.notCalled(testCollection.disableAll);
                        assert.calledWith(testCollection.disableTest, tests[0].fullTitle());
                        assert.neverCalledWith(testCollection.disableTest, tests[1].fullTitle());
                        assert.calledWith(testCollection.disableTest, tests[2].fullTitle());
                    });
                });
        });
    });
});
