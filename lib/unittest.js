var assert = require('assert');
var sys = require('sys');


var TestResult = function () {
  this.failures = [];
  this.errors = [];
  this.testsRun = 0;
  this.shouldStop = false;
};
TestResult.prototype = {
  startTest: function (test) {
    this.testsRun += 1;
  },
  stopTest: function (test) {
    // pass
  },
  addError: function (test, err) {
    this.errors.push([test, this._exc_info_to_string(err, test)]);
  },
  addFailure: function (test, err) {
    this.failures.push([test, this._exc_info_to_string(err, test)]);
  },
  addSuccess: function (test) {
    // pass
  },
  wasSuccessful: function () {
    return (this.failures.length == 0 && this.errors.length == 0);
  },
  stop: function () {
    this.shouldStop = true;
  },
  _exc_info_to_string: function (err, test) {
    if (err instanceof assert.AssertionError) {
      return err.stack;
    } else if (err instanceof Error) {
      return err.stack;
    } else {
      return Error(err);
    }
  }
};
exports.TestResult = TestResult;


var TestCase = function (methodName) {
  this._testMethodName = methodName || 'runTest';
  var testMethod = this[this._testMethodName];
  if (testMethod === undefined) {
    throw Error('no such test method ' + methodName);
  }
  this._testMethodDoc = methodName;
};
TestCase.prototype = {
  setUp: function () { },
  tearDown: function () { },
  countTestCases: function () { return 1; },
  defaultTestResult: function () { return TestResult(); },
  runTest: function () { },
  shortDescription: function () { 
    return classNameFromInstance(this) + '.' + this._testMethodDoc;
  },
  /* TODO(termie): how to come up with an id? */
  id: function () { return 'TEST CASE'; },
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
  failureException: assert.AssertionError,
  run: function (result) {
    result = result || this.defaultTestResult();
    result.startTest(this);
    var testMethod = this[this._testMethodName];
    var self = this;

    try {
      try {
        this.setUp();
      } catch (e) {
        result.addError(this, e);
        return
      }

      var ok = false;
      var async = false;
      try {
        var rv = testMethod.call(this);
        if (rv) {
          rv.addCallback(function () { result.addSuccess(self); });
          rv.addErrback(function (e) {
            if (e instanceof self.failureException) {
              result.addFailure(self, e);
            } else {
              result.addError(self, e);
            }
          });
          rv.addBoth(function () { self.tearDown(); });
          rv.addErrback(function (e) { result.addError(self, e); });
          rv.addBoth(function () { result.stopTest(); });
          return rv;
        }
        ok = true;
      } catch (e) {
        if (e instanceof this.failureException) {
          result.addFailure(this, e);
        } else {
          result.addError(this, e);
        }
      }
      
      try {
        this.tearDown();
      } catch (e) {
        result.addError(this, e);
        ok = false;
      }
      if (ok) {
        result.addSuccess(this);
      }
      result.stopTest(this);
    } catch (e) {
      result.stopTest(this);
    }
    var d = new NotDone();
    d.callback(null);
  },
  /**
   * fail: shortcut to fail a test with a message
   */
  fail: function (message) {
    return assert.ok.call(this, false, message);
  },
  /**
   * assert*: copied directly from node's assert module, see
   * the node documentation for specific semantics.
   */
  assertOk: function () {
    return assert.ok.apply(this, arguments);
  },
  assertEqual: function () {
    return assert.equal.apply(this, arguments);
  },
  assertNotEqual: function () {
    return assert.notEqual.apply(this, arguments);
  },
  assertDeepEqual: function () {
    return assert.deepEqual.apply(this, arguments);
  },
  assertNotDeepEqual: function () {
    return assert.notDeepEqual.apply(this, arguments);
  },
  assertStrictEqual: function () {
    return assert.strictEqual.apply(this, arguments);
  },
  assertNotStrictEqual: function () {
    return assert.notStrictEqual.apply(this, arguments);
  },
  assertThrows: function () {
    return assert.throws.apply(this, arguments);
  },
  /* These next three are pretty weird and not supported */
  assertFail: function () {
    return assert.fail.apply(this, arguments);
  },
  assertDoesNotThrow: function () {
    return assert.doesNotThrow.apply(this, arguments);
  },
  assertIfError: function () {
    return assert.ifError.apply(this, arguments);
  },
};
exports.TestCase = TestCase;


var TestSuite = function (tests) {
  this._tests = [];
  this.addTests(tests);
}
TestSuite.prototype = {
  countTestCases: function () {
    var cases = 0;
    for (var i in this._tests) {
      cases += this._tests[i].countTestCases()
    }
    return cases;
  },
  addTest: function (test) {
    this._tests.push(test);
  },
  addTests: function (tests) {
    for (var i in tests) {
      this.addTest(tests[i]);
    }
  },
  run: function (result, lock) {
    var testLock = lock || new TestSemaphore(1);
    var self = this;
    for (var i in this._tests) {
      // NOTE(termie): was getting some weird behavior, so am forcing scope
      (function () {
        var test = self._tests[i];
        // TestSuite's will just add more tests to the queue
        if (test instanceof TestSuite) {
          test.run(result, testLock);
        } else {
          var runTest = function () {
            if (result.shouldStop) {
              var d = new NotDone();
              d.callback(null);
              return d;
            }
            var rv = test.run(result, testLock);       
            return rv;
          }

          var d = testLock.acquire();
          d.addCallback(runTest);
          d.addBoth(function () { testLock.release(); });
        }
      })();
    }

    var d = new NotDone();
    d.callback('done queueing tests');
    return d;
  },
};



var TestLoader = function () {
};
TestLoader.prototype = {
  testMethodMatcher: /^test/,
  suiteClass: TestSuite,
  sortTestMethodsUsing: function (a, b) { return a < b },
  loadTestsFromTestCase: function (testCaseClass) {
    var testCaseNames = this.getTestCaseNames(testCaseClass);
    if (!testCaseNames && testCaseClass.runTest) {
      testCaseNames = ['runTest'];
    }
    var testCases = [];
    for (var i in testCaseNames) {
      testCases.push(new testCaseClass(testCaseNames[i]));
    }
    return new this.suiteClass(testCases);
  },
  loadTestsFromModule: function (module) {
    var tests = [];
    for (var k in module) {
      var obj = module[k];
      if (obj.prototype instanceof TestCase) {
        // store the test name for later
        loadedTests[k] = obj;
        tests.push(this.loadTestsFromTestCase(obj));
      }
    }
    return new this.suiteClass(tests);
  },
  getTestCaseNames: function (testCaseClass) {
    var testCaseInst = new testCaseClass();
    var testFnNames = [];
    for (var k in testCaseInst) {
      if (this.testMethodMatcher.test(k)
          && typeof(testCaseInst[k]) == 'function') {
        testFnNames.push(k);
      }
    }
    testFnNames.sort(this.sortTestMethodsUsing);
    return testFnNames;
  },
}


var TextTestResult = function (stream, descriptions, verbosity) {
  TestResult.call(this);
  this.stream = stream;
  this.showAll = verbosity > 1;
  this.dots = verbosity == 1;
  this.descriptions = descriptions;
  this.separator1 = '==================================================='
  this.separator2 = '==================================================='
};
sys.inherits(TextTestResult, TestResult);
TextTestResult.prototype.getDescription = function (test) {
  if (this.descriptions) {
    return test.shortDescription() || test.toString();
  } else {
    return test.toString();
  }
};
TextTestResult.prototype.startTest = function (test) {
  TestResult.prototype.startTest.call(this, test);
  if (this.showAll) {
    this.stream.write(this.getDescription(test));
    this.stream.write(' ... ');
  }
};
TextTestResult.prototype.addSuccess = function (test) {
  TestResult.prototype.addSuccess.call(this, test);
  if (this.showAll) {
    this.stream.write('ok\n');
  } else if (this.dots) {
    this.stream.write('.');
  }
};
TextTestResult.prototype.addError = function (test, error) {
  TestResult.prototype.addError.call(this, test, error);
  if (this.showAll) {
    this.stream.write('ERROR\n');
  } else if (this.dots) {
    this.stream.write('E');
  }
};
TextTestResult.prototype.addFailure = function (test, failure) {
  TestResult.prototype.addFailure.call(this, test, failure);
  if (this.showAll) {
    this.stream.write('FAIL\n');
  } else if (this.dots) {
    this.stream.write('F');
  }
};
TextTestResult.prototype.printErrors = function () {
  if (this.dots || this.showAll) {
    this.stream.write('\n');
  }
  this.printErrorList('ERROR', this.errors);
  this.printErrorList('FAIL', this.failures);
};
TextTestResult.prototype.printErrorList = function (flavor, errors) {
  for (var i in errors) {
    var test = errors[i][0];
    var err = errors[i][1];
    this.stream.write(this.separator1 + '\n');
    this.stream.write(flavor + ': ' + this.getDescription(test) + '\n');
    this.stream.write(this.separator2 + '\n');
    this.stream.write(err + '\n\n');
  }
  this.stream.write('\n');
};


var TextTestRunner = function () {
  this.stream = process.stdout;
  this.descriptions = 1;
  this.verbosity = 1;
  this.startTime = 0;
};
TextTestRunner.prototype = {
  _makeResult: function () {
    return new TextTestResult(this.stream, this.descriptions, this.verbosity);
  },
  run: function (test) {
    var result = this._makeResult();
    var lock = new TestSemaphore(1);

    this.startTime = (new Date()).getTime();
    test.run(result, lock);
    
    // TODO(termie): make this use all locks
    var d = lock.acquire();
    d.addCallback(function () { result.stop() });
    
    this._waitForTest(result);
  },
  _waitForTest: function (result) {
    var self = this;
    var wait = function () {
      if (result.shouldStop) {
        self._finishRun(result);
        return;
      }
      process.nextTick(wait);
    }
    wait();
  },
  _finishRun: function (result) {
    var stopTime = (new Date()).getTime();
    var timeTaken = stopTime - this.startTime;
    var run = result.testsRun;
    result.printErrors();
    this.stream.write(result.separator2 + '\n');
    this.stream.write('Ran ' + run + ' test' + ((run != 1) ? 's' : '') + ' in ' + timeTaken + 'ms\n');
    this.stream.write('\n');
    if (!result.wasSuccessful()) {
      this.stream.write('FAILED (')
      if (result.failures.length) {
        this.stream.write('failures=' + result.failures.length);
      }
      if (result.errors.length) {
        if (result.failures.length) {
          this.stream.write(', ');
        }
        this.stream.write('errors=' + result.errors.length);
      }
      this.stream.write(')\n');
    } else {
      this.stream.write('OK\n');
    }
  }
};


/* Based on Twisted's DeferredSemaphore */
var TestSemaphore = function (tokens) {
  this.tokens = tokens;
  this.limit = tokens;
  this.waiting = [];
}
TestSemaphore.prototype = {
  debug: function (s) {
    if (0) {
      sys.puts(s);
    }
  },
  acquire: function () {
    var d = new NotDone();
    if (!this.tokens) {
      this.waiting.push(d);
      this.debug('wait ' + this.waiting.length);
    } else {
      this.tokens -= 1;
      this.debug('acquire ' + (this.limit - this.tokens));
      d.callback(this);
    }
    return d;
  },
  release: function () {
    this.debug('release ' + (this.limit - this.tokens));
    if (this.tokens >= this.limit) {
      throw Error('released too many times');
    }
    this.tokens += 1;
    if (this.waiting.length) {
      this.debug('waiting ' + this.waiting.length);
      this.tokens -= 1;
      var d = this.waiting.shift();
      d.callback(this);
    }
  }
}


/** NotDone
 * A Deferred-style object to allow waiting on test results.
 *
 * Sadly this has become rather full-featured and is effectively a copy of
 * Twisted's Deferred implementation.
 */
var NotDone = function () {
  this.callbacks = [];
  this.called = false;
  this.paused = 0;
  this.result = null;
  this._runningCallbacks = false;
};
NotDone.prototype = {
  callback: function (result) {
    this._startRunCallbacks(result);
  },
  errback: function (fail) {
    if (!e instanceof Error) {
      fail = Error(fail);
    }
    this._startRunCallbacks(fail);
  },
  _startRunCallbacks: function (result) {
    if (this.called) {
      throw Error('callback has already been called');
    }
    this.called = true;
    this.result = result;
    this._runCallbacks();
  },
  _runCallbacks: function () {
    if (this._runningCallbacks) {
      return
    }
    if (!this.paused) {
      while (this.callbacks.length) {
        var item = this.callbacks.shift();
        var cb = item[0];
        if (this.result instanceof Error) {
          cb = item[1];
        }
        try {
          this._runningCallbacks = true;
          try {
            this.result = cb(this.result);
          } catch (e) {
            this.result = e;
          }
          this._runningCallbacks = false;
          if (this.result && this.result.addBoth) {
            this.pause();
            var self = this;
            this.result.addBoth(function (x) { self._continue(x); });
            break;
          }
        } catch (e) {
          this.result = e;
        }
      }
    }
  },
  pause: function () {
    this.paused += 1;
  },
  unpause: function () {
    this.paused -= 1;
    if (this.paused) {
      return null;
    }
    if (this.called) {
      this._runCallbacks();
    }
  },
  _continue: function (result) {
    //sys.puts('continue: ' + result)
    this.result = result;
    this.unpause();
  },
  // internal only
  cancel: function () {
    this.callbacks = [];
  },
  // internal only
  addCallback: function (callable) {
    this.callbacks.push([callable, this.passThru]);
    if (this.called) {
      this._runCallbacks();
    }
    return this
  },
  // internal only
  addErrback: function (callable) {
    this.callbacks.push([this.passThru, callable]);
    if (this.called) {
      this._runCallbacks();
    }
    return this
  },
  addBoth: function (callback) {
    this.callbacks.push([callback, callback]);
    if (this.called) {
      this._runCallbacks();
    }
    return this
  },
  passThru: function (result) {
    return result;
  },
};
exports.NotDone = NotDone;


var defaultTestLoader = new TestLoader();


var run = function (testModules) {
  var tests = [];
  for (var i in testModules) {
    tests.push(defaultTestLoader.loadTestsFromModule(testModules[i]))
  }
  var suite = new TestSuite(tests);
  var runner = new TextTestRunner();
  runner.run(suite);
};
exports.run = run


/** loadedTests is a hack so that we can figure out the 'classname' of a given
 *  TestCase instance.
 */
var loadedTests = {};

var classNameFromInstance = function (inst) {
  var possibles = [];
  for (var k in loadedTests) {
    if (inst instanceof loadedTests[k]) {
      possibles.push(k);
    }
  }
  var winner = possibles.shift();
  while (possibles.length) {
    var next = possibles.shift();
    if (!(loadedTests[winner].prototype instanceof loadedTests[next])) {
      winner = next;
    }
  }
  return winner;
};
