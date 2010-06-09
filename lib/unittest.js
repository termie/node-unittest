var assertlib = require('assert');
var sys = require('sys');

var TestCase = function () { };

TestCase.prototype = {
  setUp: function () { },
  tearDown: function () { },
  /**
   * fail: shortcut to fail a test with a message
   */
  fail: function (message) {
    return assertlib.ok.call(this, false, message);
  },
  /**
   * assert*: copied directly from node's assert module, see
   * the node documentation for specific semantics.
   */
  assertOk: function () {
    return assertlib.ok.apply(this, arguments);
  },
  assertFail: function () {
    return assertlib.fail.apply(this, arguments);
  },
  assertEqual: function () {
    return assertlib.equal.apply(this, arguments);
  },
  assertNotEqual: function () {
    return assertlib.notEqual.apply(this, arguments);
  },
  assertDeepEqual: function () {
    return assertlib.deepEqual.apply(this, arguments);
  },
  assertNotDeepEqual: function () {
    return assertlib.notDeepEqual.apply(this, arguments);
  },
  assertStrictEqual: function () {
    return assertlib.strictEqual.apply(this, arguments);
  },
  assertNotStrictEqual: function () {
    return assertlib.notStrictEqual.apply(this, arguments);
  },
  assertThrows: function () {
    return assertlib.throws.apply(this, arguments);
  },
  assertDoesNotThrow: function () {
    return assertlib.doesNotThrow.apply(this, arguments);
  },
  assertIfError: function () {
    return assertlib.ifError.apply(this, arguments);
  },
  /**
   * extend: naive shortcut to 'extend' the base test class
   *
   * I think we're all pretty tired of typing 
   * sys.inherits(MyTestCase, unittest.TestCase);
   * MyTestCase.prototype.testWhatever = function () { ... };
   * MyTestCase.prototype.testWhateverElse = function () { ... };
   *
   * This lets you call
   * sys.inherits(MyTestCase, unittest.TestCase);
   * MyTestCase.prototype.extend({
   *   testWhatever: function () { ... },
   *   testWhateverElse: function () { ... },
   * });
   *
   */
  extend: function (obj) {
    for (k in obj) {
      this[k] = obj[k];
    }
  },
  _catchError: function (e) {
    if (e instanceof assertlib.AssertionError) {
      sys.print('F');
      this.failures.push([this._currentTest, e]);
    } else {
      sys.print('E');
      this.errors.push([this._currentTest, e]);
    }
  },
  _pass: function () {
    sys.print('.');
    this.passes.push(this._currentTest);
  },
  _timeout: function () {
    this._timedOut = true;
  },
  _done: function () {
    if (this._waiting) {
      clearTimeout(this._waitingTimeout);
      this._waiting = false;
    }
    this._doneWaiting = true;
  },
  _waitForTest: function (timeout) {
    this._waiting = true;
    this._doneWaiting = false;
    this._timedOut = false;
    var self = this;
    this._waitingTimeout = setTimeout(
        function () { self._timeout(); },
        /* 60 seconds */ 2000);
  },
  _printResults: function () {
    sys.puts('\n');
    for (i in this.failures) {
      sys.puts('-----------------------------------');
      sys.puts('FAIL: ' + this.failures[i][0]);
      sys.puts('-----------------------------------');
      sys.puts(this.failures[i][1]);
    }

    for (i in this.errors) {
      sys.puts('-----------------------------------');
      sys.puts('ERROR: ' + this.errors[i][0]);
      sys.puts('-----------------------------------');
      sys.puts(this.errors[i][1]);
    }

    sys.puts('\n');
    sys.puts('Results: Passed ' + this.passes.length +
             ', Failed ' + this.failures.length +
             ', Errors ' + this.errors.length);
    if (this.passes.length > 0 && 
        this.failures.length === 0 &&
        this.errors.length === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  },
  run: function () {
    this.passes = [];
    this.failures = [];
    this.errors = [];

    var self = this;
    
    var testKeys = [];
    for (k in this) {
      if (k.match(/^test/)) {
        testKeys.push(k);
      }
    }

    this._currentTest = null;

    var runTest = function () {
      if (self._waiting) {
        if (self._timedOut) {
          self._catchError('test timed out');
          self._done();
        }
        if (self._doneWaiting) {
          process.nextTick(runTest);
          return;
        }
        process.nextTick(runTest);
        return;
      }
      
      if (testKeys.length === 0) {
        self._printResults();
        return;
      }
      
      self._currentTest = testKeys.pop();
      
      self.setUp();
      try {
        var rv = self[self._currentTest]();

        // if they returned a Deferred, wait on it
        if (rv) {
          rv.addErrback(function (e) { self._catchError(e); });
          rv.addCallback(function () { self._pass(); });
          rv.addBoth(function () { self._done(); },
                     function() { self._done(); });
          rv.addBoth(function () { self.tearDown(); },
                     function () { self.tearDown(); } );   
          self._waitForTest(60000);
        } else {
          self._pass();
          self._done();
          self.tearDown();
        }
      } catch (e) {
        self._catchError(e);
        self._done();
        self.tearDown();
      }
      process.nextTick(runTest);
    };

    runTest();
  }
};

/** NotDone
 * A very minimal Deferred-style object to allow waiting on test results.
 *
 * This doesn't actually support any of the good features of Deferreds, it 
 * is only there to provide the 'callback' and 'errback' interfaces to the
 * test so that it can be useful as is or replaced by a real Deferred if
 * the user is using those.
 *
 * Note that unlike actual Deferreds these will not check the result of
 * callbacks in any way to decide whether errbacks or callbacks should be used.
 */
var NotDone = function () {
  this.callbacks = [];
};

NotDone.prototype = {
  callback: function (value) {
    sys.puts('CALLBACKK');
    var rv = value;
    for (i in this.callbacks) {
      if (this.callbacks[i][0]) {
        rv = this.callbacks[i][0](rv);
      }
    }
  },
  errback: function (e) {
    var rv = value;
    for (i in this.callbacks) {
      if (this.callbacks[i][1]) {
        rv = this.callbacks[i][1](rv);
      }
    }
  },
  // internal only
  cancel: function () {
    this.callbacks = [];
  },
  // internal only
  addCallback: function (callable) {
    this.callbacks.push([callable, null]);
  },
  // internal only
  addErrback: function (callable) {
    this.callbacks.push([null, callable]);
  },
  addBoth: function (callback, errback) {
    this.callbacks.push([callback, errback]);
  }
};

exports.TestCase = TestCase;
exports.NotDone = NotDone;

