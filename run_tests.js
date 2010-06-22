require.paths.unshift('./lib');
require.paths.unshift('./tests');

var unittest = require('unittest');
var core_unittest = require('core_unittest');
var another_unittest = require('another_unittest');

//unittest.run([core_unittest, another_unittest]);
unittest.run([core_unittest, another_unittest]);
