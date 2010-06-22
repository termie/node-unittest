var sys = require('sys');
var unittest = require('unittest');

var FailingTestCase = function () { unittest.TestCase.apply(this, arguments); }
sys.inherits(FailingTestCase, unittest.TestCase);
FailingTestCase.prototype.extend({
  /* This test should fail */
  testFails: function () {
    this.fail('this is an expected failure to test failure display');
  },
  /* This test should throw an error */
  testStringErrors: function () {
    throw 'this is an expected error to test string errors display';
  },
  /* This test should throw an error */
  testTracebackErrors: function () {
    throw Error('this is an expected error to test traceback errors display');
  },
  testPassesAnyway: function () {
    this.assertOk(true);
  }
});
exports.FailingTestCase = FailingTestCase;
