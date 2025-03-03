var qiq2 = (function() {

  // if (typeof Object.assign != 'function') {
  //   Object.assign = function(target, varArgs) { // .length of function is 2
  //     if (target == null) // TypeError if undefined or null
  //       throw new TypeError('Cannot convert undefined or null to object');

  //     var to = Object(target);

  //     for (var index = 1; index < arguments.length; index++) {
  //       var nextSource = arguments[index];

  //       if (nextSource != null) { // Skip over if undefined or null
  //         for (var nextKey in nextSource) {
  //           // Avoid bugs when hasOwnProperty is shadowed
  //           if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
  //             to[nextKey] = nextSource[nextKey];
  //           }
  //         }
  //       }
  //     }
  //     return to;
  //   };
  // }

  function merge(target, varArgs) {
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];

      for (var key in source) {
        if (target[key])
          console.warn("Cannot overwrite " + key + " property");
        else
          target[key] = source[key]
      }
    }
    return target;
  }

  var HCHARS = /[&<>"']/,
      TAGS = /[?!#@_\/]/;

  var Checks = {
    '==': function(a, b) { return a === b },
    '!=': function(a, b) { return a !== b },
    '<':  function(a, b) { return Number(a) <   Number(b) },
    '<=': function(a, b) { return Number(a) <=  Number(b) },
    '>':  function(a, b) { return Number(a) >   Number(b) },
    '>=': function(a, b) { return Number(a) >=  Number(b) },
  };

  var Filters = {
    h: function(s) {
      if (!s || !s.replace || !HCHARS.test(s))
        return s;

      return s
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g, '&#39;');
    },
    decode: decodeURIComponent,
    encode: encodeURIComponent,
    upper: function(s) { return s.toUpperCase() },
    lower: function(s) { return s.toLowerCase() },
    slug: function(s) { return s.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-') }
  }

  var Utils = {
    // if check
    c: function (t, p, l) {
      return Checks[t](p, l);
    },

    // return array
    a: function(v) {
      if (Array.isArray(v)) {
        return (v.length === 0) ? null : v;
      }
      return v ? [v] : null;
    },

    // return boolean
    b: function(v) {
      return (!v || v.length == 0) ? false : true;
    },

    // return value (if it's a function, invoke it with locals)
    v: function(s, t, l, c) {
      if (typeof s === 'function') {
        return s.call(c, t, l);
      }
      return s;
    },

    // return value to be displayed
    d: function(s, t, l, c) {
      if (typeof s === 'function') {
        return s.call(c, t, l);
      }

      return (s === null || s === undefined) ? '' : s;
    }
  };

  function parseTemplate(src, opts) {

    var opts       = opts || {},
        main       = [],    // global buf, to be returned by parse function
        buf        = main,  // cur buf, where content is added
        stack      = [],    // stack of parents blocks
        contents   = {};    // contents to be replaced in layouts

    // add string
    function pushStr(str) {
      if (opts.trim) {
        // remove line returns and following spaces
        str = str.replace(/[\r\n]+\s*/g , '');
        // escape backslashes
        str = str.replace(/\\/g, '\\\\');
      }

      // escape single quotes
      str = str.replace(/'/g, '\\\'');

      var i = buf.length - 1, last = buf[i];

      // concat with previous string buf
      if (typeof last === 'string') {
        buf[i] = last + str;
        return;
      }

      // push
      buf.push(str);
    }

    // push block
    function putB(b) {
      buf.push(b);
    }

    // stack the block, use its buf as cur
    function stackB(b)  {
      b.buf  = [];
      b.cur = b.buf;
      buf   = b.buf;
      stack.push(b);
    }

    function lastB() {
      return stack[stack.length-1];
    }

    function pop() {
      var b = stack.pop(), last = lastB();
      buf = last && last.cur || main;
      return b;
    }

    function addBody(tag) {
      var last = lastB();
      if (!last) {
        throw new Error('no block, cannot add body');
      }

      if (!tag) tag = 'else';

      // if (tag != 'else' && last.tag != tag)
      //   throw new Error('wrong tag: ' + tag + ', should be else or ' + last.tag)

      if (tag != 'else')
        throw new Error('invalid tag: _' + tag + ', should be _else')

      last.bods      = last.bods || {};
      last.bods[tag] = [];
      buf = last.cur = last.bods[tag];
    }

    // parse tag. returns true if tag was found
    function parseTag(str) {
      var b = {
        type: str[0],
        tag:  str,
      };

      if (!TAGS.test(b.type)) {
        // skip this tag if it's not correct
        // if (str.indexOf(' ') >= 0 || str.indexOf('(') >= 0 || str.indexOf(';') >= 0) {
        if (str.indexOf('(') >= 0 || str.indexOf(';') >= 0) {
          console.warn('invalid tag:', str)
          return false;
        }

        if (str.slice(-1) == '?') {
          b.type = '?';
          b.tag = str.slice(0, -1);
        } else {
          // handle .prop in main scope
          if (!stack.length && str[0] == '.')
            b.tag = str.slice(1);

          // reference
          b.type = 'r';
          parseF(str, b);
          putB(b);

          return true;
        }
      } else {
        if (b.type != '/' && b.type != '!' && str.slice(-1) == '?')
          console.warn('Redundant ? found at end of tag ' + str)

        // remove first char and ? symbols at the end
        b.tag = str.substring(1).split(/ |\?/)[0]
      }

      // parse params
      // b.params = parseParams(str);
      // b.params = {};

      // handle #.foo or .foo? in main scope
      if (!stack.length && b.tag[0] == '.')
        b.tag = b.tag.slice(1);

      switch (b.type) {

        case '?': // if
        case '!': // not
        case '#': // loop
          putB(b);
          stackB(b);
          break;

        // if
        case '@':
          var matches = str.match(/if (.+)\s?(==|!=|<|>|<=|>=?)\s?(.+)/);
          if (!matches) return false; // no match method found

          b.method = matches[2];
          // b.params = { key: matches[1].trim(), value: matches[3].trim().replace(/['|"]/g, '') };
          b.params = { key: matches[1].trim(), value: matches[3].trim() };

          putB(b);
          stackB(b);
          break;

        // _else (body)
        case '_':
          addBody(b.tag);
          break;

        // end
        case '/':
          var o = pop();
          if (!o) {
            console.warn('extra closing /');
          } else if (b.tag && o.tag !== b.tag)  {
            console.warn('tag mismatch', o.tag, b.tag);
          }
          break;
      }

      return true;
    }

    // parse filters
    function parseF(str, b) {
      var regexp = new RegExp('([ ]*\\|[ ]*\\w+)+', 'g');
      var m = regexp.exec(str);
      if (m) {
        b.tag = str.substring(0, m.index);
        var f = m[0].replace(/ /g, '').substring(1).split('|');
        var s = f.indexOf('raw');
        if (s > -1) {
          f.splice(s, 1);
        } else {
          f.push('h');
        }
        b.f = f;
      } else {
        b.f = ['h'];
      }
    }

    return function() {

      // remove spaces at the beginning of lines and line breaks
      if (opts.trim) {
        src = src.replace(/^\s+/g, '');
      } else {
        src = src.replace(/\r/g , '\\r').replace(/\n/g , '\\n');
      }

      // remove comments
      // src = removeComments(src);
      var dd = (opts || {}).delimiters || ['{{', '}}'],
          regA  = new RegExp('(.*?)\\' + dd[0] + '\\s*', 'msg'),
          regB  = new RegExp('(.*?)\\' + dd[1], 'msg'),
          index = 0, openM, closeM;

      // find opening '{'
      while ((openM = regA.exec(src)) !== null) {
        if (openM[1]) {
          // preceding string
          pushStr(openM[1]);
        }
        index = openM.index + openM[0].length;

        // find closing '}'
        var tag = '';
        regB.lastIndex = index;
        while ((closeM = regB.exec(src)) !== null) {
          tag += closeM[1];
          // skip when closing an internal '{'
          if (closeM[1].lastIndexOf(dd[0]) === -1) {
            break;
          }
          tag += dd[1];
        }

        if (!closeM) { // parsing error
          throw new Error('No ' + dd[1] + 'at idx', index);
        }

        index = closeM.index + closeM[0].length;
        regA.lastIndex = index;

        if (!parseTag(tag.trim())) {
          // console.log('tag is ignored')
          // tag is ignored: push content to buf
          pushStr('{' + tag + '}');
        }
      }

      // stack should be empty
      if (stack.length > 0) {
        throw new Error('Missing closing tag for', stack[0].type, stack[0].tag);
      }

      if (index < src.length) {
        pushStr(src.slice(index));
      }

      return main;
    }()
  }

  function compileTemplate(src) {

    var i = 0,
        r = 'var r=\'\',l=l||{},c=c||{ctx:[]};var a=s?function(x){s.write(String(x))}:function(x){r+=x};';

    // compile buffer
    function compBuf(buf, parentVar) {
      // precompile, for content functions
      // buf.forEach(b => {
      //   if (b.type === '<') {
      //     r += 'c._' + b.tag}=function(){var r='';';
      //     r += 'var a=s?function(x){s.write(String(x))}:function(x){r+=x};';
      //     compBuf(b.buf);
      //     r += 'return r;};';
      //   }
      // });

      buf.forEach(function(b) {
        if (b.type === 'r') { // reference
          r += 'a(' + _getRef(b) + ');';
        // } else if (block.type === '+' && !b.tag) {
        //   // insert body (invoke content function)
        //   r += 'if(c._$body){a(c._$body());c._$body=null;}';
        // } else if (block.type === '+') {
        //   // insert content (invoke content function)
        //   r += 'if(c._' + block.tag + '){a(c._' + block.tag + '())}';
        //   if (block.buf) {
        //     r += 'else{';
        //     compBuf(block.buf);
        //     r += '}';
        //   }
        } else if (b.type === '?' || b.type === '!' ) {
          // conditional block
          var not = b.type === '!' ? '!' : '';
          _pushC();
          r += 'if(' + not + 'u.b(' + _val(b.tag) + ')){';
          compBuf(b.buf);
          r += '}';
          _else(b);
          _popC();
        } else if (b.type === '#') {
          // loop block
          i++;
          var e = i;
          _pushC(true);
          r += 'var a' + e + '=u.a(' + _val(b.tag) + ');';
          r += 'if(a' + e + '){';
          if (!b.buf) {
            r += 'a(a' + e + ')';
          } else {
            // var it = block.params.it && stripDoubleQuotes(block.params.it);
            r += 'l._up=' + _parent(b.tag) + ';';
            r += 'l.$len=a' + e + '.length;'; // cur array length
            r += 'for(var i' + e + '=0;i' + e + '<a' + e + '.length;i' + e + '++){';
            // if (it) {
            //   r += 'l.' + it}=a' + e + '[i' + e + '];';
            // }
            r += 'l._it=a' + e + '[i' + e + '];';
            r += 'l.$idx=i' + e + ';'; // cur id
            compBuf(b.buf, 'a' + e);
            r += '}';
          }
          r += '}';
          _else(b);
          _popC(true);
        } else if (b.type === '@') { // if check
          i++;
          var e = i;
          // r += 'var h' + e + '=u.h(\'' + b.tag + '\',' + _getParams(b.params) + ',l);';
          r += 'var h' + e + '=u.c(\'' + b.method + '\',' + _val(b.params.key) + ',' + b.params.value + ',l);';
          r += 'if(h' + e + '){';
          if (b.buf) {
            compBuf(b.buf);
          } else {
            r += 'a(h' + e + ');';
          }
          r += '}';
          _else(b);
        } else if (!b.type) {
          // default: raw text
          r += 'a(\'' + b + '\');';
        }
      });
    }

    function _else(b) {
      if (b.bods && b.bods.else) {
        r += 'else{';
        compBuf(b.bods.else);
        r += '}';
      }
    }

    function _pushC(isArray) {
      var e = i;
      r += 'var ctx' + e + '={};';
      // Object.keys(params).forEach(key => {
      //   if (key === '$') {
      //     return;
      //   }
      //   r += 'ctx' + e + '.' + key}=l.' + key};';
      //   r += 'l.' + key}=' + _getParam(params[key])};';
      // });
      if (isArray) {
        r += 'ctx' + e + '._it=l._it;';
        r += 'ctx' + e + '._up=l._up;';
        r += 'ctx' + e + '.idx=l.$idx;';
        r += 'ctx' + e + '.length=l.$len;';
      }

      r += 'c.ctx.push(ctx' + e + ');';
    }

    function _popC(isArray) {
      var e = i;
      r += 'var p_ctx' + e + '=c.ctx.pop();';
      // Object.keys(params).forEach(key => {
      //   if (key === '$') {
      //     return;
      //   }
      //   r += 'l.' + key}=p_ctx' + e + '.' + key};';
      // });
      if (isArray) {
        r += 'l._it=p_ctx' + e + '._it;';
        r += 'l._up=p_ctx' + e + '._up;';
        r += 'l.$idx=p_ctx' + e + '.idx;';
        r += 'l.$len=p_ctx' + e + '.length;';
      }
    }

    function _resolveVal(tag) {
      if (!isNaN(tag)) return tag;

      if (tag[0] == "'" || tag[0] == '"') { // looks like a string
        return [tag];
        // return '' + utilFn + '(' + tag + ',l._it,l,c)';
      }

      // . notation
      if (tag[0] === '.') {
        tag = '_it' + tag;
      }

      var els = [], i, c, sub = false, idx = 0;
      // parse ref
      for (i = 0; i < tag.length; i = 1 + i) {
        c = tag[i];
        if (!sub && (c === '.' || c === '[')) {
          if (i > idx) {
            els.push(tag.substring(idx, i));
          }
          idx = i + 1;
          sub = (c === '[');
        } else if (c === ']') {
          els.push('[' + _val(tag.substring(idx, i)) + ']');
          sub = false;
          idx = i + 1;
        }
      }

      // last part
      if (i > idx) els.push(tag.substring(idx, i));

      // build string
      var cur = 'l', ret = [];
      els.forEach(function(el) {
        if (el[0] === '[') {
          cur += el;
        } else {
          cur += '.' + el;
        }
        ret.push(cur);
      });

      return ret;
    }

    function _parent(tag) {
      var last = _resolveVal(tag).pop();
      return last.replace(/\.[^.]+$/, '');
	  // return parts.pop()
    }

    function _val(tag, utilFn) {
      utilFn = utilFn || 'u.v';

      if (tag.trim() === '.')
        return 'l._it';

      if (tag[0] == '.' && tag[1] == '.') { // parent
        var obj = 'l._up.' + tag.substring(2);
        return '' + utilFn + '(' + obj + ',l._up,l,c)';
      }

      var ret = _resolveVal(tag);

      // use utilFn (u.v by default) to invoke function on last el
      if (ret.length === 1) {
        // return '' + utilFn}(' + ret[0]},null,l)';
        return '' + utilFn + '(' + ret[0] + ',l._it,l,c)';
      }

      var arr = ret.slice(0,-1);
      return '' + utilFn + '(' + ret.join('&&') + ',' + arr.join('&&') + ',l,c)';
    }

    function _getRef(b) {
      var o = _val(b.tag, 'u.d');
      if (!b.f) return o;
      b.f.forEach(function(f) { o = 'u.f.' + f + '(' + o + ',l,c)' });
      return o;
    }

    compBuf(src);
    return new Function('l', 'u', 'c', 's', r + 'return r;');
  }

  function copyFilters(target, obj) {
    for (var name in obj) {
      if (target[name])
        console.warn("Cannot overwrite " + name + " filter");
      else
        target[name] = obj[name];
    }
    return target;
  }

  return {
    setup: function(opts) {
      if (opts && opts.filters) {
        merge(Filters, opts.filters)
      }
    },
    compile: function(src, opts) {
      return compileTemplate(parseTemplate(src, opts));
    },
    render: function(compiled, data, opts, res) {
      Utils.f = opts && opts.filters ? merge({}, Filters, opts.filters) : Filters;
      return compiled(data, Utils, opts && opts.context, res);
    }
  }

})()

if (typeof module !== 'undefined' && module.exports) {
  exports = module.exports = qiq2.render;
  exports.compile = qiq2.compile;
  exports.setup = qiq2.setup;
}
