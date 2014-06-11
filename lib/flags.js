//
// # Namespaced flags for identifier
//

/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var assert = require('assert');

var Flags = module.exports = function Flags(namespace, identifier, flags, rag) {
  EventEmitter.call(this);

  this.namespace = namespace;
  this.identifier = identifier;
  this.flags = flags || {};
  this.rag = rag;
};

inherits(Flags, EventEmitter);

Flags.prototype.set = function flagsSet(flag, on, fn) {
  var errmsg = 'Invalid flag: ' + flag + ' for namespace: ' + this.namespace;
  assert(this.rag.validateFlag(this.namespace, flag), errmsg);

  this.flags[flag] = on;

  this.emit('changed', this, flag, on);
  this.rag.save(this.namespace, this.identifier, flag, on, fn);
};

Flags.prototype.check = function flagsCheck(flag) {
  return !!this.flags[flag];
};

Flags.prototype.refresh = function flagsRefresh(fn) {
  var self = this;
  this.rag.get(this.namespace, this.identifier, function flagsRefreshDone(err, c) {
    self.flags = c.flags;
    self.emit('refreshed', this);
    fn(err);
  });
};

Flags.prototype.serialize = function serialize() {
  return {
    namespace: this.namespace,
    identifier: this.identifier,
    flags: this.flags
  };
};
