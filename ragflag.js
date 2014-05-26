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
  this.namespaces = {};
  this.queue = contra.queue(this.performSave.bind(this), opts.concurrent || 2);
  this.Flags = connection.model('RagFlags', {
    identifier: Number,
    flags: {}
  });

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

RagFlag.prototype.get = function ragflagGet(name, id, fn) {
  assert(this.namespaces[name], 'Invalid namespace.');
  var identifier = { identifier: id };
  var self = this;
  this.Flags.findOne(identifier, 'flags', { lean: true }, function ragFetch(err, c) {
    /* istanbul ignore if */
    if (err) return fn(err, null);
    var flags = c ? c.flags[name] : false;
    var instance = new Flags(name, id, flags, self);
    fn(null, instance);
  });
};

RagFlag.prototype.validateFlag = function ragflagValidate(namespace, flag) {
  var hasNamespace = Array.isArray(this.namespaces[namespace]);
  if (!hasNamespace) return false;
  var hasFlag = this.namespaces[namespace].indexOf(flag) !== -1;
  return hasFlag;
};

RagFlag.prototype.save = function ragflagSave(name, id, flag, on, fn) {
  var job = {
    name: name,
    id: id,
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

RagFlag.prototype.performSave = function ragflagPerformSave(job, done) {
  var identifier = { identifier: job.id };
  var self = this;
  var update = { flags: {} };
  /* istanbul ignore else */
  if (!update.flags[job.name]) {
    update.flags[job.name] = {};
  }
  update.flags[job.name][job.flag] = job.on;
  var options = {
    upsert: true
  };
  this.Flags.findOneAndUpdate(identifier, update, options, handleSave);
  function handleSave(err, doc) {
    /* istanbul ignore if */
    if (err) {
      self.emit('error', err);
    }
    done();
  }
};

