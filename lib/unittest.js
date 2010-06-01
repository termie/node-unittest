var assert = require('assert');
var sys = require('sys');

var TestCase = function () { };
TestCase.prototype.setUp = function () { };
TestCase.prototype.tearDown = function () { };
TestCase.prototype.run = function () {
  this.passes = [];
  this.failures = [];
  this.errors = [];
  for (var k in this) {
    if (k.match(/^test/)) {
      this.setUp();
      try {
        this[k]();
        sys.print('.');
        this.passes.push(k);
      } catch (e) {
        if (e instanceof assert.AssertionError) {
          sys.print('F');
          this.failures.push([k, e]);
        } else {
          sys.print('E');
          this.errors.push([k, e]);
        }
      }
      this.tearDown();
    }
  }

  sys.puts('');
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
};


exports.TestCase = TestCase;
