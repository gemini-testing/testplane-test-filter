'use strict';

const Promise = require('bluebird');
const fs = require('fs-extra');
const _ = require('lodash');
const globExtra = require('glob-extra');
const parseConfig = require('./config');

const readReports = async (paths) => {
    const reportFilePaths = await globExtra.expandPaths(paths);

    return _.flatten(await Promise.map(reportFilePaths, (p) => fs.readJson(p)));
};

module.exports = (hermione, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled) {
        return;
    }

    if (hermione.isWorker()) {
        return;
    }

    let reports;

    hermione.on(hermione.events.INIT, async () => {
        reports = await readReports(pluginConfig.reportsPath);
    });

    hermione.on(hermione.events.AFTER_TESTS_READ, (testCollection) => {
        if (_.isEmpty(reports)) {
            console.warn('Reports are not found. All tests will be run.');

            return;
        }

        testCollection.disableAll();

        reports.forEach(({title, browser}) => testCollection.enableTest(title, browser));
    });
};
