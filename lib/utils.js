'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

exports.readFile = async (path) => {
    let data = '';

    try {
        data = await fs.readFileAsync(path);
    } catch (e) {
        data = '[]';
    }

    return JSON.parse(data.toString());
};
