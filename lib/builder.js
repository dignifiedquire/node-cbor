// Generated by CoffeeScript 1.7.1
(function() {
  var BufferStream, Builder, Evented, MINUS_ONE, MT, TAG, TEN, TWO, Tagged, bignumber, constants, events, url, utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  events = require('events');

  url = require('url');

  bignumber = require('bignumber.js');

  BufferStream = require('../lib/BufferStream');

  Tagged = require('../lib/tagged');

  utils = require('../lib/utils');

  Evented = require('./evented');

  constants = require('./constants');

  TAG = constants.TAG;

  MT = constants.MT;

  MINUS_ONE = new bignumber(-1);

  TEN = new bignumber(10);

  TWO = new bignumber(2);

  Builder = (function(_super) {
    __extends(Builder, _super);

    function Builder(parser, tags) {
      var f, k, v;
      this.parser = parser;
      this.on_end = __bind(this.on_end, this);
      this.on_stream_stop = __bind(this.on_stream_stop, this);
      this.on_stream_start = __bind(this.on_stream_start, this);
      this.on_map_stop = __bind(this.on_map_stop, this);
      this.on_map_start = __bind(this.on_map_start, this);
      this.on_array_stop = __bind(this.on_array_stop, this);
      this.on_array_start = __bind(this.on_array_start, this);
      this.on_value = __bind(this.on_value, this);
      this.on_error = __bind(this.on_error, this);
      this.tags = {};
      for (k in TAG) {
        v = TAG[k];
        f = this["tag_" + k];
        if ((f != null) && (typeof f === 'function')) {
          this.tags[v] = f;
        }
      }
      utils.extend(this.tags, tags);
      this.stack = [];
      if (this.parser == null) {
        this.parser = new Evented;
      }
      this.listen();
    }

    Builder.prototype.on_error = function(er) {
      return this.emit('error', er);
    };

    Builder.prototype.process = function(val, tags, kind) {
      var er, f, key, t, _i, _ref;
      for (_i = tags.length - 1; _i >= 0; _i += -1) {
        t = tags[_i];
        try {
          f = this.tags[t];
          if (f != null) {
            val = (_ref = f.call(this, val)) != null ? _ref : new Tagged(t, val);
          } else {
            val = new Tagged(t, val);
          }
        } catch (_error) {
          er = _error;
          val = new Tagged(t, val, er);
        }
      }
      switch (kind) {
        case null:
          return this.emit('complete', val);
        case 'array first':
        case 'array':
          return this.last.push(val);
        case 'key first':
        case 'key':
          return this.stack.push(val);
        case 'stream first':
        case 'stream':
          return this.last.write(val);
        case 'value':
          key = this.stack.pop();
          return this.last[key] = val;
        default:
          return console.log('unknown', kind);
      }
    };

    Builder.prototype.on_value = function(val, tags, kind) {
      return this.process(val, tags, kind);
    };

    Builder.prototype.on_array_start = function(count, tags, kind) {
      if (this.last != null) {
        this.stack.push(this.last);
      }
      return this.last = [];
    };

    Builder.prototype.on_array_stop = function(count, tags, kind) {
      var val, _ref;
      _ref = [this.last, this.stack.pop()], val = _ref[0], this.last = _ref[1];
      return this.process(val, tags, kind);
    };

    Builder.prototype.on_map_start = function(count, tags, kind) {
      if (this.last != null) {
        this.stack.push(this.last);
      }
      return this.last = {};
    };

    Builder.prototype.on_map_stop = function(count, tags, kind) {
      var val, _ref;
      _ref = [this.last, this.stack.pop()], val = _ref[0], this.last = _ref[1];
      return this.process(val, tags, kind);
    };

    Builder.prototype.on_stream_start = function(mt, tags, kind) {
      if (this.last != null) {
        this.stack.push(this.last);
      }
      return this.last = new BufferStream;
    };

    Builder.prototype.on_stream_stop = function(count, mt, tags, kind) {
      var val, _ref;
      _ref = [this.last, this.stack.pop()], val = _ref[0], this.last = _ref[1];
      val = val.read();
      if (mt === MT.UTF8_STRING) {
        val = val.toString('utf8');
      }
      return this.process(val, tags, kind);
    };

    Builder.prototype.on_end = function() {
      return this.emit('end');
    };

    Builder.prototype.listen = function() {
      this.parser.on('value', this.on_value);
      this.parser.on('array start', this.on_array_start);
      this.parser.on('array stop', this.on_array_stop);
      this.parser.on('map start', this.on_map_start);
      this.parser.on('map stop', this.on_map_stop);
      this.parser.on('stream start', this.on_stream_start);
      this.parser.on('stream stop', this.on_stream_stop);
      this.parser.on('end', this.on_end);
      return this.parser.on('error', this.on_error);
    };

    Builder.prototype.unlisten = function() {
      this.parser.removeListener('value', this.on_value);
      this.parser.removeListener('array start', this.on_array_start);
      this.parser.removeListener('array stop', this.on_array_stop);
      this.parser.removeListener('map start', this.on_map_start);
      this.parser.removeListener('map stop', this.on_map_stop);
      this.parser.removeListener('stream start', this.on_stream_start);
      this.parser.removeListener('stream stop', this.on_stream_stop);
      this.parser.removeListener('end', this.on_end);
      return this.parser.removeListener('error', this.on_error);
    };

    Builder.prototype.unpack = function(buf, offset, encoding) {
      return this.parser.unpack(buf, offset, encoding);
    };

    Builder.parse = function(buf, cb) {
      var actual, d;
      d = new Builder;
      actual = [];
      d.on('complete', function(v) {
        return actual.push(v);
      });
      d.on('end', function() {
        if (cb) {
          return cb(null, actual);
        }
      });
      d.on('error', cb);
      return d.unpack(buf);
    };

    Builder.prototype.tag_DATE_STRING = function(val) {
      return new Date(val);
    };

    Builder.prototype.tag_DATE_EPOCH = function(val) {
      return new Date(val * 1000);
    };

    Builder.prototype.tag_POS_BIGINT = function(val) {
      return utils.bufferToBignumber(val);
    };

    Builder.prototype.tag_NEG_BIGINT = function(val) {
      return MINUS_ONE.minus(utils.bufferToBignumber(val));
    };

    Builder.prototype.tag_DECIMAL_FRAC = function(val) {
      var e, m;
      e = val[0], m = val[1];
      return TEN.pow(e).times(m);
    };

    Builder.prototype.tag_BIGFLOAT = function(val) {
      var e, m;
      e = val[0], m = val[1];
      return TWO.pow(e).times(m);
    };

    Builder.prototype.tag_URI = function(val) {
      return url.parse(val);
    };

    Builder.prototype.tag_REGEXP = function(val) {
      return new RegExp(val);
    };

    return Builder;

  })(events.EventEmitter);

  module.exports = Builder;

}).call(this);