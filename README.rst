xUnit-style testing for node.js
===============================

A style of testing you are familiar with from every other unit test you've
ever written.

BTW, for a node.js-y framework for doing mocks check out: http://github.com/termie/node-jsmock

This is just about a direct port of Python's `unittest` with additions
to allow it to support asynchronous testing.

Example
-------

::
  // in core_unittest.js

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
  
  // in run_tests.js
  var unittest = require('unittest');
  var core_unittest = require('core_unittest');
  unittest.run([core_unittest]);

Example Output
--------------

::

  % node run_tests.js                                          [master] 3:20:38
  ....EE.F
  ===================================================
  ERROR: FailingTestCase.testTracebackErrors
  ===================================================
  Error: this is an expected error to test traceback errors display
      at Error (unknown source)
      at [object Object].testTracebackErrors (tests/another_unittest.js:17:11)
      at [object Object].run (lib/unittest.js:104:29)
      at lib/unittest.js:229:27
      at Object._runCallbacks (lib/unittest.js:506:27)
      at Object._startRunCallbacks (lib/unittest.js:490:10)
      at Object.callback (lib/unittest.js:476:10)
      at Object.release (lib/unittest.js:455:9)
      at lib/unittest.js:235:44
      at Object._runCallbacks (lib/unittest.js:506:27)

  ===================================================
  ERROR: FailingTestCase.testStringErrors
  ===================================================
  Error: this is an expected error to test string errors display


  ===================================================
  FAIL: FailingTestCase.testFails
  ===================================================
  AssertionError: this is an expected failure to test failure display
      at [object Object].fail (lib/unittest.js:148:22)
      at [object Object].testFails (tests/another_unittest.js:9:10)
      at [object Object].run (lib/unittest.js:104:29)
      at lib/unittest.js:229:27
      at Object._runCallbacks (lib/unittest.js:506:27)
      at Object._startRunCallbacks (lib/unittest.js:490:10)
      at Object.callback (lib/unittest.js:476:10)
      at Object.release (lib/unittest.js:455:9)
      at lib/unittest.js:235:44
      at Object._runCallbacks (lib/unittest.js:506:27)


  ===================================================
  Ran 8 tests in 14ms

  FAILED (failures=1, errors=2)




For a more complete example see the `tests` directory and try running 
`$ node run_tests.js` 

Additional reading:

 * Python's `unittest <http://docs.python.org/library/unittest.html>`_

---------- 
Assertions
----------

All the this.assert* methods are direct proxies to the equivalents in `assert` 

There is also a this.fail(message) that is actually assert.ok(false, message)

You can also use the `assert` library directly, if you prefer.

Async Example
-------------

Same as above, but now using a Deferred-style return (an actual Deferred will
work too) to let us know the test isn't done.

::

  BasicTestCase.prototype.testInitialized = function () {
    this.assertEqual(this.example, 'example');
  
    var done = unittest.NotDone();
    setTimeout(function () { done.callback(true); }, 5000);
    return done;
  };

The above won't finish the test until the callback on `done` has been called
(in 5 seconds).

You can also use `done.errback('some error message')` to make the test fail. 

-------
NotDone
-------

NotDone is just a bit of a shim but has become pretty much fully
Deferred-compatible, the only public methods are `callback` and `errback`, but
if you use an actual Deferred implementation everything should Just Work.


Caveats
-------

I haven't ported over the command-line interface yet, so you'll currently
need to write some equivalent of the 'run_tests.js' snippet described above.
