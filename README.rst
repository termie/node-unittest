xUnit-style testing for node.js
===============================

A style of testing you are familiar with from every other unit test you've
ever written.

Example
-------

::

  var unittest = require('unittest');
  var assert = require('assert');

  var ExampleTestCase = function () { };
  ExampleTestCase.prototype = new unittest.TestCase();

  ExampleTestCase.setUp = function () {
    this.example = 'example';
  };

  ExampleTestCase.testInitialized = function () {
    assert.equal(this.example, 'example');
  };

  var test = new ExampleTestCase();
  test.run();

You can, of course, do some of that a bit prettier syntactically if you are
using any of the multitude of javascript class/inheritance tools, but that's
the plain-old Javascript way.

Additional reading:

 * Python's `unittest <http://docs.python.org/library/unittest.html>`_

---------- 
Assertions
----------

Oh, right, you don't call this.assert* at the moment, you just use the assert
library. I'll probably add all the methods sooner or later though.


Async Example
-------------

Same as above, but now using a Deferred-style return (an actual Deferred will
work too) to let us know the test isn't done.

::

  ExampleTestCase.testInitialized = function () {
    assert.equal(this.example, 'example');
  
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
