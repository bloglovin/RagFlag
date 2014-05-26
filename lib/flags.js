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
  this.flags = flags || [];
  this.rag = rag;
};

inherits(Flags, EventEmitter);

Flags.prototype.set = function flagsSet(flag, on, fn) {
  var errmsg = 'Invalid flag: ' + flag + ' for collection: ' + this.name;
  assert(this.rag.validateFlag(flag, this.name), errmsg);

  var flagIndex = this.flags.indexOf(flag);
  if (flagIndex === -1) {
    this.flags.push(flag);
  }
  else {
    this.flags.splice(flagIndex, 1);
  }

  this.emit('changed', this, flag, on);
  this.rag.save(this.name, this.id, flag, on, fn);
};

Flags.prototype.check = function flagsCheck(flag) {
  return this.flags.indexOf(flag) !== -1;
};

Flags.prototype.refresh = function flagsRefresh(fn) {
  var self = this;
  this.rag.get(this.name, this.id, function flagsRefreshDone(err, c) {
    self.flags = c.flags;
    self.emit('refreshed', this);
  });
};

