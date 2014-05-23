//
// # RagFlag
//
// @TODO: Clean up vocabular to make it easier to distinguish between the
// different things.
// @TODO: Be consistent with name/id order.
//

/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var assert = require('assert');

var contra = require('contra');

var Collection = require('./lib/collection');

var RagFlag = module.exports = function RagFlag(mongoose, connection, opts) {
  EventEmitter.call(this);

  opts = opts || {};
  this.connection = connection;
  this.defaultCollections= opts.defaultCollections || 'flags';
  this.collections = {};
  this.queue = contra.queue(this.performSave.bind(this), opts.concurrent || 2);
  this.Collection = mongoose.model('RagFlags', {
    name: String,
    identifier: Number,
    flags: []
  });

  if (opts.collections) {
    this.configure(opts.collections);
  }
};

inherits(RagFlag, EventEmitter);

RagFlag.prototype.configure = function ragflagConfigure(collection, flags) {
  // Could use a merge instead. But I guess this essentially is that, without
  // the lib.
  if (!(collection instanceof String)) {
    for (var c in collection) {
      this.configure(c, collection[c]);
    }
    return;
  }

  assert(collection instanceof String, 'Collection name must be a string.');
  assert(Array.isArray(flags), 'Flags must be an array.');
  this.collections[collection] = flags;
};

RagFlag.prototype.get = function ragflagGet(name, id, fn) {
  var identifier = { identifier: id, name: name };
  var self = this;
  this.Collection.findOne(identifier, function ragFetch(err, c) {
    if (err) return fn(err, null);
    var instance = new Collection(c.name, c.identifier, c.flags, self);
  });
};

RagFlag.prototype.validateFlag = function ragflagValidate(flag, collection) {
  var hasCollection = Array.isarray(this.collections[collection]);
  var hasFlag = hasCollection && this.collections[collection].indexOf(flag);
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
  var identifier = { identifier: job.id, name: job.name };
  var self = this;
  this.Collection.findOne(identifier, function ragFetch(err, c) {
    if (err) return done(err, null);

    var index = c.flags.indexOf(job.flag);
    // If on and flag is not already there
    if (job.on && index === -1) {
      c.flags.push(job.flag);
      c.save(handleSave);
    }
    // If off and flag is there
    else if (job.off && index !== -1){
      c.flags.splice(index, 1);
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

