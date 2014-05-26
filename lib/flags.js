//
// # Collection
//

/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var assert = require('assert');

var Flags = module.exports = function Flags(name, id, flags, rag) {
  EventEmitter.call(this);

  this.name = name;
  this.id = id;
  this.flags = flags || {};
  this.rag = rag;
};

inherits(Flags, EventEmitter);

Flags.prototype.set = function flagsSet(flag, on, fn) {
  var errmsg = 'Invalid flag: ' + flag + ' for collection: ' + this.name;
  assert(this.rag.validateFlag(this.name, flag), errmsg);

  this.flags[flag] = on;

  this.emit('changed', this, flag, on);
  this.rag.save(this.name, this.id, flag, on, fn);
};

Flags.prototype.check = function flagsCheck(flag) {
  return !!this.flags[flag];
};

Flags.prototype.refresh = function flagsRefresh(fn) {
  var self = this;
  this.rag.get(this.name, this.id, function flagsRefreshDone(err, c) {
    self.flags = c.flags;
    self.emit('refreshed', this);
    fn(err);
  });
};

