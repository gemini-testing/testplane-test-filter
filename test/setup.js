'use strict';

const Promise = require('bluebird');
const chai = require('chai');

chai.use(require('chai-as-promised'));
global.sinon = require('sinon');
global.assert = chai.assert;

sinon.assert.expose(chai.assert, {prefix: ''});
Promise.promisifyAll(require('fs'));
