'use strict';

const _ = require('lodash');
const TestCodeCollection = require('../lib/test-code-collection');

const FILE_PATH = 'some-file';
const SUITE_NAME = 'some-suite';
const HOOK_BODY = 'hookBody';
const TEST_NAME = `${SUITE_NAME} some-test`;
const TEST_BODY = 'testBody';

const testItemId = `${TEST_NAME} (${FILE_PATH})`;
const suiteItemId = `${SUITE_NAME} (${FILE_PATH})`;

describe('test-code-collection', () => {
    const sandbox = sinon.createSandbox();

    let testCodeCollection;
    let hook;
    let suite;
    let test;
    let testItem;
    let suiteItem;

    beforeEach(() => {
        suite = {
            fullTitle: () => SUITE_NAME,
            file: FILE_PATH
        };
        hook = {
            type: 'hook',
            title: 'before each',
            body: HOOK_BODY,
            parent: suite
        };
        test = {
            type: 'test',
            fullTitle: () => TEST_NAME,
            file: FILE_PATH,
            body: TEST_BODY,
            parent: suite
        };
        testItem = {test};
        suiteItem = {beforeEach: [hook]};
    });

    afterEach(() => sandbox.restore());

    describe('add', () => {
        it('should add hook or test in collection', () => {
            testCodeCollection = new TestCodeCollection();

            testCodeCollection.add(hook);

            assert.lengthOf(_.keys(testCodeCollection._collection), 1);
        });
    });

    describe('getTestCode', () => {
        it('should return correct value', () => {
            sandbox.stub(TestCodeCollection.prototype, '_getItem')
                .withArgs(TEST_NAME, FILE_PATH).returns(testItem)
                .withArgs(SUITE_NAME, FILE_PATH).returns(suiteItem);
            sandbox.stub(TestCodeCollection.prototype, '_getHookStackCode').returns({beforeEachCode: HOOK_BODY});

            testCodeCollection = new TestCodeCollection({
                [testItemId]: testItem,
                [suiteItemId]: suiteItem
            });

            const expectedValue = [HOOK_BODY, TEST_BODY].join('\n');

            assert.equal(testCodeCollection.getTestCode(test.fullTitle(), FILE_PATH), expectedValue);
        });
    });
});
