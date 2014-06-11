//
// # RagFlag
//

/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var assert = require('assert');

var contra = require('contra');

var Flags = require('./lib/flags');

var RagFlag = module.exports = function RagFlag(connection, opts) {
  EventEmitter.call(this);

  opts = opts || {};
  this.connection = connection;
  this.defaultNamespace= opts.defaultNamespace || 'flags';
  this.collection = opts.collection || 'ragflags';
  this.namespaces = {};
  this.queue = contra.queue(ragflagPerformSave(this), opts.concurrent || 2);
  this.Flags = connection.model('RagFlags', {
    identifier: Number,
    flags: {}
  }, this.collection);

  if (opts.namespaces) {
    this.configure(opts.namespaces);
  }
};

inherits(RagFlag, EventEmitter);

RagFlag.prototype.configure = function ragflagConfigure(namespace, flags) {
  if (typeof namespace === 'object') {
    for (var n in namespace) {
      this.configure(n, namespace[n]);
    }
    return;
  }

  assert(typeof namespace === 'string', 'Namespace name must be a string.');
  assert(Array.isArray(flags), 'Flags must be an array.');
  this.namespaces[namespace] = flags;
};

RagFlag.prototype.get = function ragflagGet(namespace, identifier, fn) {
  assert(this.namespaces[namespace], 'Invalid namespace.');
  var search = { identifier: identifier };
  var self = this;
  this.Flags.findOne(search, 'flags', { lean: true }, function ragFetch(err, c) {
    /* istanbul ignore if */
    if (err) return fn(err, null);
    var flags = c ? c.flags[namespace] : false;
    var instance = new Flags(namespace, identifier, flags, self);
    fn(null, instance);
  });
};

RagFlag.prototype.validateFlag = function ragflagValidate(namespace, flag) {
  var hasNamespace = Array.isArray(this.namespaces[namespace]);
  if (!hasNamespace) return false;
  var hasFlag = this.namespaces[namespace].indexOf(flag) !== -1;
  return hasFlag;
};

RagFlag.prototype.save = function ragflagSave(namespace, identifier, flag, on, fn) {
  var job = {
    namespace: namespace,
    identifier: identifier,
    flag: flag,
    on: on
  };

  var self = this;
  if (typeof fn === 'function') {
    this.queue.unshift(job, function () {
      self.emit('saved', job);
      fn.apply(fn, arguments);
    });
  }
  else {
    this.queue.push(job, function () {
      self.emit('saved', job);
    });
  }
};

RagFlag.prototype.initFlag = function ragflagInitFlag(namespace, identifier, flags) {
  var self = this;
  var invalidFlags = Object.keys(flags).filter(function (flagName) {
    return !self.validateFlag(namespace, flagName);
  });

  assert(
    invalidFlags.length === 0,
    'Invalid flag(s): ' + invalidFlags.join(', ') + ' for namespace: ' + namespace);

  return new Flags(namespace, identifier, flags, this);
};

function ragflagPerformSave(context) {
  return function (job, done) {
    var search = { identifier: job.identifier };
    var path = ['flags', job.namespace, job.flag].join('.');
    var update = {};
    var options = {};

    if (job.on) {
      update.$set = {};
      update.$set[path] = true;
      options.upsert = true;
    }
    else {
      update.$unset = {};
      update.$unset[path] = "";
    }

    context.Flags.findOneAndUpdate(search, update, options, handleSave);

    function handleSave(err, doc) {
      /* istanbul ignore if */
      if (err) {
        context.emit('error', err);
      }
      done();
    }
  };
}
