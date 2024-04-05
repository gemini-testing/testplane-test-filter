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

        input.forEach(({fullTitle, browserId}) => testCollection.enableTest(fullTitle, browserId));
    });
};
