'use strict';

const _ = require('lodash');
const parseConfig = require('./config');
const utils = require('./utils');
const TestCodeCollection = require('./test-code-collection');

module.exports = (hermione, opts) => {
    const pluginConfig = parseConfig(opts);
    let cliTool;

    hermione.on(hermione.events.CLI, (cli) => {
        cliTool = cli;
        cli.option(
            '--filter-tests-by-code <string>',
            'enable hermione-test-filter plugin and run with filtering tests by their code'
        );
    });

    if (!pluginConfig.enabled || hermione.isWorker()) {
        return;
    }

    let input;
    let testCodeCollection;

    hermione.on(hermione.events.INIT, async () => {
        const filterTestsByCode = cliTool && cliTool.filterTestsByCode || pluginConfig.filterTestsByCode;

        if (pluginConfig.inputFile) {
            input = await utils.readFile(pluginConfig.inputFile);
        }

        if (!input && !filterTestsByCode) {
            return;
        }

        hermione.on(hermione.events.BEFORE_FILE_READ, ({testParser}) => {
            if (!filterTestsByCode) {
                return;
            }

            testCodeCollection = new TestCodeCollection();

            testParser.on(testParser.events.HOOK, (hook) => {
                testCodeCollection.add(hook);
            });
            testParser.on(testParser.events.TEST, (test) => {
                testCodeCollection.add(test);
            });
        });

        hermione.on(hermione.events.AFTER_TESTS_READ, (testCollection) => {
            if (pluginConfig.inputFile && input && input.length) {
                testCollection.disableAll();

                input.forEach(({fullTitle, browserId}) => testCollection.enableTest(fullTitle, browserId));
            }

            if (!filterTestsByCode) {
                return;
            }

            const filter = _.isFunction(filterTestsByCode)
                ? filterTestsByCode
                : (testSrc) => new RegExp(filterTestsByCode).test(testSrc);

            testCollection.eachTest((test, browserId) => {
                if (test.disabled) {
                    return;
                }

                const testCode = testCodeCollection.getTestCode(test.fullTitle(), test.file);

                if (!filter(testCode)) {
                    testCollection.disableTest(test.fullTitle(), browserId);
                }
            });
        });
    });
};
