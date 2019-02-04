'use strict';

const _ = require('lodash');
const parseConfig = require('./config');
const utils = require('./utils');
const helpers = require('./helpers');

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
            return;
        }

        testCollection.disableAll();

        input.reverse().forEach(({fullTitle, browserId}) => {
            helpers.raiseUpTest.call(testCollection, fullTitle, browserId);
            testCollection.enableTest(fullTitle, browserId);
        });
    });
};
