var sys = require('sys');
var unittest = require('unittest');

var BasicTestCase = function () { unittest.TestCase.apply(this, arguments); }
sys.inherits(BasicTestCase, unittest.TestCase);
BasicTestCase.prototype.extend({
  isSetUp: false,
  setUp: function () {
    this.assertEqual(this.isSetUp, false);
    this.isSetUp = true;
  },
  tearDown: function () {
    this.isSetUp = false;
  },
  testPasses: function () {
    this.assertOk(true);
    this.assertEqual('a', 'a');
    this.assertNotEqual('a', 'b');
    this.assertDeepEqual({b: 'a'}, {b: 'a'});
    this.assertNotDeepEqual({b: 'a'}, {b: 'b'});
    this.assertStrictEqual(1, 1);
    this.assertNotStrictEqual(1, "1");
    this.assertThrows(function () { throw 'die'; }, 'die');
  }
});
exports.BasicTestCase = BasicTestCase;

var InheritedTestCase = function () { BasicTestCase.apply(this, arguments); };
sys.inherits(InheritedTestCase, BasicTestCase);
InheritedTestCase.prototype.extend({
  testInheritedSetup: function () {
    this.assertOk(this.isSetUp);
  },
  testReturnNotDone: function () {
    var d = new unittest.NotDone()
    setTimeout(function () { d.callback(true); }, 10);
    return d;
  },
});
exports.InheritedTestCase = InheritedTestCase;
