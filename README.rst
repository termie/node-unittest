xUnit-style testing for node.js
===============================

A style of testing you are familiar with from every other unit test you've
ever written.

Example
-------

::

  var unittest = require('unittest');
  var sys = require('sys');
  
  var TestCase = unittest.TestCase;

  var ExampleTestCase = function () { TestCase.call(this) };
  sys.inherits(ExampleTestCase, TestCase);
  
  ExampleTestCase.prototype.extend({
    setUp: function () {
      TestCase.setUp.call(this);
      this.example = 'example';
    },
    testInitialized: function () {
      this.assertEqual(this.example, 'example');
    }
  });

  var test = new ExampleTestCase();
  test.run();

You can, of course, do some of that a bit prettier syntactically if you are
using any of the multitude of javascript class/inheritance tools, but that's
pretty much the plain-old Javascript way.

Additional reading:

 * Python's `unittest <http://docs.python.org/library/unittest.html>`_

---------- 
Assertions
----------

All the this.assert* methods are direct proxies to the equivalents in `assert` 

There is also a this.fail(message) that is actually assert.ok(false, message)

You can also use the `assert` library directly, for now at least.

Async Example
-------------

Same as above, but now using a Deferred-style return (an actual Deferred will
work too) to let us know the test isn't done.

::

  ExampleTestCase.prototype.testInitialized = function () {
    this.assertEqual(this.example, 'example');
  
    var done = unittest.NotDone();
    setTimeout(function () { done.callback(true); }, 5000);
    return done;
  };

The above won't finish the test until the callback on `done` has been called
(in 5 seconds) or until the test times out (right now 60 seconds).

You can also use `done.errback('some error message')` to make the test fail. 

-------
NotDone
-------

NotDone is just a bit of a shim so don't expect it to be fully
Deferred-compatible, the only public methods are `callback` and `errback`, but
if you use an actual Deferred implementation everything should Just Work.


Caveats
-------

Right now you can only really call TestCase.run() once, it calls sys.exit()
when it is finished, mostly because I don't know how to clear all existing
timeouts from the reactor. This will likely be fixed once I have a lot more
tests written and get annoyed by this process.
