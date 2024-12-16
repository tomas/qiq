var qiq2 = (function() {

  // special chars
  var HCHARS = /[&<>"']/;
  var TAGS = /[?!#@_\/]/;

  var Checks = {
    '==': function(a, b) { return a === b },
    '!=': function(a, b) { return a !== b },
    '<':  function(a, b) { return Number(a) <   Number(b) },
    '<=': function(a, b) { return Number(a) <=  Number(b) },
    '>':  function(a, b) { return Number(a) >   Number(b) },
    '>=': function(a, b) { return Number(a) >=  Number(b) },
  };

  var Utils = {
    f: {
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
      slug: function(str) { return str.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-') },
      t: function(key, data) { return data._strings && data._strings[key] || key },
      // upper: function(s) { return s.toUpperCase() },
      // lower: function(s) { return s.toLowerCase() },
    }, // filters

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
    v: function(s, t, l) {
      if (typeof s === 'function') {
        return s.call(t, l);
      }
      return s;
    },

    // return value to be displayed
    d: function(s, t, l) {
      if (typeof s === 'function') {
        return s.call(t, l);
      }

      return (s === null || s === undefined) ? '' : s;
    }
  };

  function parseTemplate(src, opts) {

    var main       = [],    // global buf, to be returned by parse function
        buf        = main,  // cur buf, where content is added
        stack      = [],    // stack of parents blocks
        contents   = {};    // contents to be replaced in layouts

    // add string
    function pushStr(str) {
      if (opts.htmltrim) {
        // remove line returns and following spaces
        str = str.replace(/[\r\n]+\s*/g , '');
        // escape backslashes
        str = str.replace(/\\/g, '\\\\');
      }

      // escape single quotes
      str = str.replace(/'/g, '\\\'');

      var i = buf.length - 1,
          last = buf[i];

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
      last.bods       = last.bods || {};
      last.bods[tag]  = [];
      buf = last.cur = last.bods[tag];
    }

    function getTagName(s) {
      var i = s.indexOf(' ');
      if (i >= 0) {
        s = s.substring(0, i);
      }
      return s.substring(1);
    };

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
          console.warn('invalied tag:', str)
          return false;
        }
        // reference
        b.type = 'r';
        parseF(str, b);
        putB(b);
        return true;
      }

      // remove first char
      b.tag = getTagName(str);

      // parse params
      // b.params = parseParams(str);
      // b.params = {};

      switch (b.type) {
        // if
        case '?':
          putB(b);
          stackB(b);
          break;

        // not
        case '!':
          putB(b);
          stackB(b);
          break;

        // loop
        case '#':
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

        // body
        case '_':
          if (b.tag != 'else')
            throw new Error(`wrong tag {${b.type}${b.tag}`)
          addBody(b.tag);
          break;

        // end
        case '/':
          var o = pop();
          if (o && b.tag && o.tag !== b.tag)  {
            console.error(`tag mismatch: ${o.tag} vs ${b.tag}`);
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
      if (opts.htmltrim) {
        src = src.replace(/^\s+/g, '');
      } else {``
        src = src.replace(/\r/g , '\\r').replace(/\n/g , '\\n');
      }

      // remove comments
      // src = removeComments(src);
      var dd = (opts || {}).delimeters || ['{{', '}}'],
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
          throw new Error(`No ${dd[1]} at idx ${index}`);
        }

        index = closeM.index + closeM[0].length;
        regA.lastIndex = index;

        if (!parseTag(tag)) {
          // console.log('tag is ignored')
          // tag is ignored: push content to buf
          pushStr(`{${tag}}`);
        }
      }

      // stack should be empty
      if (stack.length > 0) {
        throw new Error(`Missing closing tag for {${stack[0].type}${stack[0].tag}`);
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
    function compBuf(buf) {
      // precompile, for content functions
      // buf.forEach(b => {
      //   if (b.type === '<') {
      //     r += `c._${b.tag}=function(){var r='';`;
      //     r += 'var a=s?function(x){s.write(String(x))}:function(x){r+=x};';
      //     compBuf(b.buf);
      //     r += 'return r;};';
      //   }
      // });

      buf.forEach(b => {
        if (b.type === 'r') {
          // reference
          r += `a(${_getRef(b)});`;
        // } else if (block.type === '+' && !b.tag) {
        //   // insert body (invoke content function)
        //   r += `if(c._$body){a(c._$body());c._$body=null;}`;
        // } else if (block.type === '+') {
        //   // insert content (invoke content function)
        //   r += `if(c._${block.tag}){a(c._${block.tag}())}`;
        //   if (block.buf) {
        //     r += 'else{';
        //     compBuf(block.buf);
        //     r += '}';
        //   }
        } else if (b.type === '?' || b.type === '!' ) {
          // conditional block
          var not = b.type === '!' ? '!' : '';
          _pushC();
          r += `if(${not}u.b(${_val(b.tag)})){`;
          compBuf(b.buf);
          r += '}';
          _else(b);
          _popC();
        } else if (b.type === '#') {
          // loop block
          i++;
          var e = i;
          _pushC(true);
          r += `var a${e}=u.a(${_val(b.tag)});`;
          r += `if(a${e}){`;
          if (!b.buf) {
            r += `a(a${e})`;
          } else {
            // var it = block.params.it && stripDoubleQuotes(block.params.it);
            r += `l.$length=a${e}.length;`; // cur array length
            r += `for(var i${e}=0;i${e}<a${e}.length;i${e}++){`;
            // if (it) {
            //   r += `l.${it}=a${e}[i${e}];`;
            // }
            r += `l._it=a${e}[i${e}];`;
            r += `l.$idx=i${e};`; // cur id
            compBuf(b.buf, true);
            r += '}';
          }
          r += '}';
          _else(b);
          _popC(true);
        } else if (b.type === '@') { // if check
          i++;
          var e = i;
          // r += `var h${e}=u.h('${b.tag}',${_getParams(b.params)},l);`;
          r += `var h${e}=u.c('${b.method}',${_val(b.params.key)},${b.params.value},l);`;
          r += `if(h${e}){`;
          if (b.buf) {
            compBuf(b.buf);
          } else {
            r += `a(h${e});`;
          }
          r += '}';
          _else(b);
        } else if (!b.type){
          // default: raw text
          r += `a('${b}');`;
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
      r += `var ctx${e}={};`;
      // Object.keys(params).forEach(key => {
      //   if (key === '$') {
      //     return;
      //   }
      //   r += `ctx${e}.${key}=l.${key};`;
      //   r += `l.${key}=${_getParam(params[key])};`;
      // });
      if (isArray) {
        r += `ctx${e}._it=l._it;`;
        r += `ctx${e}.idx=l.$idx;`;
        r += `ctx${e}.length=l.$length;`;
      }

      r += `c.ctx.push(ctx${e});`;
    }

    function _popC(isArray) {
      var e = i;
      r += `var p_ctx${e}=c.ctx.pop();`;
      // Object.keys(params).forEach(key => {
      //   if (key === '$') {
      //     return;
      //   }
      //   r += `l.${key}=p_ctx${e}.${key};`;
      // });
      if (isArray) {
        r += `l._it=p_ctx${e}._it;`;
        r += `l.$idx=p_ctx${e}.idx;`;
        r += `l.$length=p_ctx${e}.length;`;
      }
    }

    function _val(tag, utilFn) {
      utilFn = utilFn || 'u.v';

      if (!isNaN(tag)) return tag;

      // . notation
      if (tag === '.') {
        return 'l._it';
      } else if (tag[0] === '.') {
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

      // use utilFn (u.v by default) to invoke function on last el
      if (ret.length === 1) {
        // return `${utilFn}(${ret[0]},null,l)`;
        return `${utilFn}(${ret[0]},l._it,l)`;
      }

      var arr = ret.slice(0,-1);
      return `${utilFn}(${ret.join('&&')},${arr.join('&&')},l)`;
    }

    function _getRef(b) {
      var o = _val(b.tag, 'u.d');
      if (!b.f) return o;
      b.f.forEach(function(f) { o = `u.f.${f}(${o},l,c)` });
      return o;
    }

    compBuf(src);
    r += 'return r;';
    return new Function('l', 'u', 'c', 's', r);
  }

  return {
    compile: function(src, opts) {
      return compileTemplate(parseTemplate(src, opts));
    },
    render: function(compiled, data, ctx, res) {
      return compiled(data, Utils, ctx, res);
    }
  }

})()

if (typeof module !== 'undefined' && module.exports) {
  /**
   * Expose `render()` and `compile()`.
   */
  exports = module.exports = qiq2.render;
  exports.compile = qiq2.compile;
}
