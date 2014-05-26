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
    flags: connection.Schema.Types.Mixed
  });

  if (opts.namespaces) {
    this.configure(opts.namespaces);
  }
};

inherits(RagFlag, EventEmitter);

RagFlag.prototype.configure = function ragflagConfigure(namespace, flags) {
  if (!(namespace instanceof String)) {
    for (var n in namespace) {
      this.configure(n, namespace[n]);
    }
    return;
  }

  assert(namespace instanceof String, 'Namespace name must be a string.');
  assert(Array.isArray(flags), 'Flags must be an array.');
  this.namespacse[namespace] = flags;
};

RagFlag.prototype.get = function ragflagGet(name, id, fn) {
  assert(this.namespaces[name], 'Invalid namespace.');
  var identifier = { identifier: id };
  var self = this;
  // @TODO: Handle case of empty response and return default Flags
  this.Flags.findOne(identifier, function ragFetch(err, c) {
    if (err) return fn(err, null);
    var instance = new Flags(name, c.identifier, c.flags[name], self);
    fn(null, instance);
  });
};

RagFlag.prototype.validateFlag = function ragflagValidate(flag, namespace) {
  var hasNamespace= Array.isarray(this.namespaces[namespace]);
  var hasFlag = hasNamespace && this.namespaces[namespace].indexOf(flag);
  return hasFlag !== -1;
};

RagFlag.prototype.save = function ragflagSave(name, id, flag, on, fn) {
  var job = {
    name: name,
    id: id,
    flag: flag,
    on: on
  };

  if (fn instanceof Function) {
    this.queue.unshift(job, fn);
  }
  else {
    this.queue.push(job);
  }
};

RagFlag.prototype.performSave = function ragflagPerformSave(job, done) {
  var identifier = { identifier: job.id };
  var self = this;
  this.Flags.findOne(identifier, function ragFetch(err, c) {
    if (err) return done(err, null);

    var flags = c.namespaces[job.name] || [];
    var index = flags.indexOf(job.flag);
    // If on and flag is not already there
    if (job.on && index === -1) {
      c.namespaces[job.name].push(job.flag);
      c.save(handleSave);
    }
    // If off and flag is there
    else if (job.off && index !== -1){
      c.namespaces[job.name].splice(index, 1);
      c.save(handleSave);
    }
    // Nothing to update
    else {
      done();
    }
  });

  function handleSave(err) {
    if (err) {
      self.emit('error', err);
    }
    done();
  }
};

