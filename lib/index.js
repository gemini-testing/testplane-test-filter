'use strict';

const _ = require('lodash');
const parseConfig = require('./config');
const utils = require('./utils');

module.exports = (hermione, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled) {
        return;
    }

    if (hermione.isWorker()) {
        return;
    }

    let input;

    hermione.on(hermione.events.INIT, async () => {
        input = await utils.readFile(pluginConfig.inputFile);
    });

    hermione.on(hermione.events.AFTER_TESTS_READ, (testCollection) => {
        if (_.isEmpty(input)) {
            console.warn('hermione-test-filter: Input file is empty. All tests will be run.');

            return;
        }

        testCollection.disableAll();

        input.forEach(({fullTitle, browserId}) => testCollection.enableTest(fullTitle, browserId));
    });
};
