/* global describe, it, beforeEach, afterEach */
/* jshint node: true */
'use strict';

var assert = require('assert');

var mongoose = require('mongoose');

var RagFlag = require('../');
var Flags = require('../lib/flags');

if (!process.env.MONGO) console.log('no mongodb connection configured, using default');
var connection = null;

describe('RagFlag', function () {
  beforeEach(function (done) {
    connection = mongoose.createConnection(process.env.MONGO + '/testRagFlag', done);
  });

  afterEach(function (done) {
    this.timeout(10000);
    connection.db.dropDatabase(function () {
      connection.close(done);
    });
  });

  it('correctly sets up', function () {
    var rag = new RagFlag(connection, {
      defaultNamespace: 'foobar',
      namespaces: {
        'bar': ['a', 'b', 'c'],
        'zoo': ['monkey', 'sealion', 'buffalo']
      }
    });

    assert(rag.defaultNamespace === 'foobar');
    assert(rag.namespaces.bar[0], 'a');
    assert(rag.namespaces.zoo[2], 'buffalo');
  });

  it('configuring a namespace after init works', function () {
    var rag = new RagFlag(connection);
    rag.configure('foobar', ['monkey', 'anteloop']);
    assert(rag.namespaces.foobar[0], 'monkey');
  });

  it('correctly validates flags', function () {
    var rag = new RagFlag(connection);
    rag.configure('foobar', ['monkey', 'anteloop']);
    assert(rag.validateFlag('foobar', 'monkey'), 'existing flag not valid');
    assert(!rag.validateFlag('foobar', 'poo'), 'non-existing flag valid');
    assert(!rag.validateFlag('barbaz', 'foo'), 'non-existing namespace valid');
  });

  it('correctly saves a flag', function (done) {
    var rag = new RagFlag(connection);
    rag.configure('foobar', ['monkey', 'anteloop']);
    rag.save('foobar', 1, 'monkey', true);

    rag.on('saved', function (job) {
      assert.equal(job.name, 'foobar');
      assert.equal(job.id, 1);
      assert.equal(job.flag, 'monkey');
      assert.equal(job.on, true);

      rag.get('foobar', 1, function (err, response) {
        assert.equal(response.flags.monkey, true);
        done();
      });
    });
  });

  it('correctly removes a flag', function (done) {
    var rag = new RagFlag(connection);
    rag.configure('foobar', ['monkey', 'anteloop']);
    rag.save('foobar', 1, 'monkey', true, function (err) {
      assert(!err);
      rag.get('foobar', 1, function (err, flags) {
        assert(!err);
        flags.set('monkey', false, function (err) {
          assert(!err);
          assert(!flags.flags.monkey);
          rag.get('foobar', 1, function (err, flagsFinal) {
            assert(!err);
            assert(!flagsFinal.flags.monkey);
            done();
          });
        });
      });
    });

    rag.on('error', function (err) {
      throw err;
    });
  });
});

describe('Flags', function () {
  beforeEach(function (done) {
    connection = mongoose.createConnection(process.env.MONGO + '/testRagFlag', done);
  });

  afterEach(function (done) {
    this.timeout(10000);
    connection.db.dropDatabase(function () {
      connection.close(done);
    });
  });

  it('getting and checking works', function (done) {
    var rag = new RagFlag(connection);
    rag.configure('foobar', ['monkey', 'anteloop']);

    var didEmitChanged = false;

    rag.get('foobar', 1, function (err, flags) {
      assert(!err);
      if (!flags.check('anteloop')) {
        flags.on('changed', function () {
          didEmitChanged = true;
        });
        flags.set('anteloop', true);
      }
    });

    rag.on('saved', function (job) {
      assert(didEmitChanged);
      assert(job.on);
      done();
    });
  });

  it('refreshing flags works', function (done) {
    var rag = new RagFlag(connection);
    rag.configure('foobar', ['monkey', 'anteloop']);
    rag.get('foobar', 1, function (err, flags) {
      flags.set('monkey', true, function (err) {
        assert(!err);
        // Save changes without "flags" knowing aout i
        rag.save('foobar', 1, 'monkey', false, function (err) {
          assert(!err);

          var didEmitRefreshed = false;
          flags.on('refreshed', function () { didEmitRefreshed = true; });
          flags.refresh(function (err) {
            assert(flags.flags.monkey === false);
            done();
          });
        });
      });
    });
  });
});

