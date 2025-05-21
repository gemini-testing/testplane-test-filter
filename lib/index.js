'use strict';

const _ = require('lodash');
const parseConfig = require('./config');
const utils = require('./utils');

module.exports = (testplane, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled) {
        return;
    }

    if (testplane.isWorker()) {
        return;
    }

    let input;

    testplane.on(testplane.events.INIT, async () => {
        input = await utils.readFile(pluginConfig.inputFile);
    });

    testplane.on(testplane.events.AFTER_TESTS_READ, (testCollection) => {
        if (_.isEmpty(input)) {
            return;
        }

        testCollection.disableAll();

        input.forEach(({fullTitle, suiteTitle, title, browserId}) => {
            if (fullTitle) {
                testCollection.enableTest(fullTitle, browserId);
            } else if (suiteTitle) {
                testCollection.eachTest((test) => {
                    if (test.parent && test.parent.title === suiteTitle) {
                        testCollection.enableTest(test.fullTitle(), browserId);
                    }
                });
            } else if (title) {
                testCollection.eachTest((test) => {
                    if (test.title === title) {
                        testCollection.enableTest(test.fullTitle(), browserId);
                    }
                });
            }
        });
    });
};
