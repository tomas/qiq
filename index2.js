// const config = {
//   // cache: false,
//   // views: './views',
//   htmlencode: true,
//   htmltrim: true,
// }

// const truthTest = (tag, test) => {
//   return (params, locals) => test(params.key, params.value);
// };

// const Helpers = {
//   eq:   truthTest('eq',   (left, right) => left === right ),
//   ne:   truthTest('ne',   (left, right) => left !== right ),
//   lt:   truthTest('lt',   (left, right) => Number(left) <   Number(right)),
//   lte:  truthTest('lte',  (left, right) => Number(left) <=  Number(right)),
//   gt:   truthTest('gt',   (left, right) => Number(left) >   Number(right)),
//   gte:  truthTest('gte',  (left, right) => Number(left) >=  Number(right)),
//   first:  (params, locals) => locals.$idx === 0,
//   last:   (params, locals) => locals.$length && locals.$length - 1 === locals.$idx,
//   sep:    (params, locals) => locals.$length && locals.$length - 1 !== locals.$idx,
//   // select: () => console.log('Error : @select not supported !'),
// };

const Checks = {
  '==': function(left, right) { return left === right },
  '!=': function(left, right) { return left !== right },
  '<':  function(left, right) { return Number(left) <   Number(right)},
  '<=': function(left, right) { return Number(left) <=  Number(right)},
  '>':  function(left, right) { return Number(left) >   Number(right)},
  '>=': function(left, right) { return Number(left) >=  Number(right)},
};

/*
var Filters = (function() {

  const escapeJs = (s) => {
    if (typeof s === 'string') {
      return s
        .replace(BS, '\\\\')
        .replace(FS, '\\/')
        .replace(DQ, '\\"')
        .replace(SQ, '\\\'')
        .replace(CR, '\\r')
        .replace(LS, '\\u2028')
        .replace(PS, '\\u2029')
        .replace(NL, '\\n')
        .replace(LF, '\\f')
        .replace(TB, '\\t');
    }
    return s;
  };

  const stringifyJson = (o) => {
    return o && JSON.stringify(o)
      .replace(LS, '\\u2028')
      .replace(PS, '\\u2029')
      .replace(LT, '\\u003c');
  };

  return {
    h:          htmlencode,
    j:          escapeJs,
    u:          encodeURI,
    uc:         encodeURIComponent,
    js:         stringifyJson,
    jp:         JSON.parse,
    uppercase:  s => s.toUpperCase(),
    lowercase:  s => s.toLowerCase(),
  };

})()
*/

// special chars
const HCHARS  = /[&<>"']/,
      AMP     = /&/g,
      LT      = /</g,
      GT      = />/g,
      QUOT    = /"/g,
      SQUOT   = /'/g;

const htmlencode = (s)=> {
  if (!s || !s.replace || !HCHARS.test(s)) {
    return s;
  }
  return s
    .replace(AMP,'&amp;')
    .replace(LT,'&lt;')
    .replace(GT,'&gt;')
    .replace(QUOT,'&quot;')
    .replace(SQUOT, '&#39;');
};


var Utils = {
  f: {
    h: htmlencode,
    slug(str) { return str.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-') }
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
      if (v.length === 0) {
        return null;
      }
      return v;
    }
    if (v) {
      return [v];
    }
    return null;
  },

  // return boolean
  b: function(v) {
    if (!v) {
      return false;
    }
    if (v.length === 0) {
      return false;
    }
    return true;
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
    if (s === null || s === undefined) {
      return '';
    }
    return s;
  },

};

// remove spaces and double quotes
// function cleanStr(s) {
//   const regexp = /["]*(.[^"]*)/;
//   const match  = regexp.exec(s);
//   return match && match[1];
// };

// remove spaces and double quotes
// function stripDoubleQuotes(s) {
//   const regexp = new RegExp('"', 'sg');
//   return s.replace(regexp, '');
// };

//
function getTagName(s) {
  const i = s.indexOf(' ');
  if (i >= 0) {
    s = s.substring(0, i);
  }
  return s.substring(1);
};

// function removeComments(str) {
//   let index = 0;
//   let openCommentMatch, closeCommentMatch;

//   const openCommentRegexp   = new RegExp('{!', 'msg');
//   const closeCommentRegexp  = new RegExp('!}', 'msg');

//   // find opening '{!'
//   while ((openCommentMatch = openCommentRegexp.exec(str)) !== null) {
//     index = openCommentMatch.index + 2;
//     // find closing '!}'
//     closeCommentRegexp.lastIndex = index;
//     while ((closeCommentMatch = closeCommentRegexp.exec(str)) !== null) {
//       str = str.slice(0, openCommentMatch.index) + str.slice(closeCommentMatch.index + 2);
//       break;
//     };
//   }

//   return str;
// };

/*

const FORBIDDEN_FIRST_CHARS = [ '\'', '{', '[' ];

function parseParams(s) {
  const params    = {};
  const original  = s
  let match;

  // string param
  const stringParam = new RegExp('(\\w+)=("[^"]*")', 'msg');
  while ((match = stringParam.exec(s)) !== null) {
    params[match[1]] = match[2];
    s = s.substring(0, match.index) + s.substring(stringParam.lastIndex);
    stringParam.lastIndex = match.index;
  }

  // ref param
  const refParam = new RegExp('(\\w+)=([^" \n\r]+)', 'msg');
  while ((match = refParam.exec(s)) !== null) {
    if (FORBIDDEN_FIRST_CHARS.indexOf(match[2][0]) >= 0) {
      throw new Error(`Unexpected character "${match[2][0]}" in tag {${original}...`);
    }
    params[match[1]] = match[2];
    s = s.substring(0, match.index) + s.substring(refParam.lastIndex);
    refParam.lastIndex = match.index;
  }

  // unnamed string param
  const unnamedStringParam = new RegExp('[^=] ?("[^"]*")', 'msg');
  if ((match = unnamedStringParam.exec(s)) !== null) {
    params.$ = match[1];
  }

  return params;
};
*/


var Tags = {

  // if
  '?': function(p, b) {
    p.putB(b);
    p.stackB(b);
  },

  // not
  '!': function(p, b) {
    p.putB(b);
    p.stackB(b);
  },

  // loop
  '#': function(p, b) {
    p.putB(b);
    p.stackB(b);
  },

  // if
  '@': function(p, b) {
    p.putB(b);
    p.stackB(b);
  },

  // body
  ':': function(p, b) {
    if (b.tag != 'else')
      throw new Error(`wrong tag {${b.type}${b.tag}`)
    p.addBody(b.tag);
  },

  // end
  '/': function(p, b) {
    var o = p.pop();
    if (o && b.tag && o.tag !== b.tag)  {
      console.error(`tag mismatch: ${o.tag} vs ${b.tag}`);
    }
  },
}

class Parser {

  constructor() {
    this.global     = [];           // global buf, to be returned by parse function
    this.buf        = this.global;     // cur buf, where content is added
    this.stack      = [];           // stack of parents blocks
    this.contents   = {};           // contents to be replaced in layouts
  }

  // add string
  pushStr(str) {
    // if (config.htmltrim) {
    //   // remove line returns and following spaces
    //   str = str.replace(/[\r\n]+\s*/g , '');
    //   // escape backslashes
    //   str = str.replace(/\\/g, '\\\\');
    // }

    // escape single quotes
    str = str.replace(/'/g, '\\\'');

    const i     = this.buf.length - 1;
    const last  = this.buf[i];

    // concat with previous string buf
    if (typeof last === 'string') {
      this.buf[i] = last + str;
      return;
    }

    // push
    this.buf.push(str);
  }

  // push block
  putB(b) {
    this.buf.push(b);
  }

  // stack the block, use its buf as cur
  stackB(b)  {
    b.buf  = [];
    b.cur = b.buf;
    this.buf   = b.buf;
    this.stack.push(b);
  }

  lastB() {
    return this.stack[this.stack.length-1];
  }

  pop() {
    const b = this.stack.pop();
    const last = this.lastB();
    this.buf = last && last.cur || this.global;
    return b;
  }

  addBody(tag) {
    const last = this.lastB();
    if (!last) {
      throw new Error('no block, cannot add body');
    }
    last.bods       = last.bods || {};
    last.bods[tag]  = [];
    this.buf = last.cur = last.bods[tag];
  }

  parse(str, opts) {
    // remove spaces at the beginning of lines and line breaks
    // if (config.htmltrim) {
    //   str = str.replace(/^\s+/g, '');
    // } else {``
      str = str.replace(/\r/g , '\\r').replace(/\n/g , '\\n');
    // }

    // remove comments
    // str = removeComments(str);

    var regStart  = new RegExp('(.*?)\\{', 'msg');
    var regClose  = new RegExp('(.*?)\\}', 'msg');

    let index = 0;

    // find opening '{'
    let openM, closeM;
    while ((openM = regStart.exec(str)) !== null) {
      if (openM[1]) {
        // preceding string
        this.pushStr(openM[1]);
      }
      index = openM.index + openM[0].length;

      // find closing '}'
      let tag = '';
      regClose.lastIndex = index;
      while ((closeM = regClose.exec(str)) !== null) {
        tag += closeM[1];
        // skip when closing an internal '{'
        if (closeM[1].lastIndexOf('{') === -1) {
          break;
        }
        tag += '}';
      }

      if (!closeM) {
        // parsing error
        throw new Error(`Missing closing "}" at idx ${index}`);
      }

      index = closeM.index + closeM[0].length;
      regStart.lastIndex = index;

      if (!this.parseTag(tag)) {
        // tag is ignored: push content to buf
        this.pushStr(`{${tag}}`);
      }
    }

    // stack should be empty
    if (this.stack.length > 0) {
      throw new Error(`Missing closing tag for {${this.stack[0].type}${this.stack[0].tag}`);
    }

    if (index < str.length) {
      this.pushStr(str.slice(index));
    }

    // console.log('--- done ---');
    // console.dir(this);
    return this.global;
  }

  // parse tag. returns true if tag was found
  parseTag(str) {
    const tag = Tags[str[0]];

    const b = {
      type: str[0],
      tag:  str,
    };

    if (!tag) {
      // skip this tag if it's not correct
      if (str.indexOf(' ') >= 0 || str.indexOf('(') >= 0 || str.indexOf(';') >= 0) {
        return false;
      }
      // reference
      b.type = 'r';
      this.parseF(str, b);
      this.putB(b);
      return true;
    }

    // remove first char
    b.tag = getTagName(str);

    if (b.type == '@') {
      var matches = str.match(/if (.+)\s?(==|>=|<=|<|>)\s?(.+)/);
      if (!matches) return false; // no match method found

      b.method = matches[2];
      // b.params = { key: matches[1].trim(), value: matches[3].trim().replace(/['|"]/g, '') };
      b.params = { key: matches[1].trim(), value: matches[3].trim() };
    }

    // parse params
    // b.params = parseParams(str);
    // b.params = {};

    // invoke tag function
    tag(this, b);

    return true;
  }

  // parse filters
  parseF(str, b) {
    var regexp = new RegExp('([ ]*\\|[ ]*\\w+)+', 'g');
    var match  = regexp.exec(str);
    if (match) {
      b.tag = str.substring(0, match.index);
      const f = match[0].replace(/ /g, '').substring(1).split('|');
      console.log(f)
      const s = f.indexOf('raw');
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

}

/*
class Cache {

  constructor() {
    this._CACHE = {};
  }

  get(key) {
    return this._CACHE[key];
  }

  put(key, value) {
    this._CACHE[key] = value;
  }

  getCompiled(filePath) {

    filePath = FileUtils.getFilePath(filePath);

    let compiled = this.get(filePath);
    if (config.cache && compiled) {
      // console.log('igo-dust cache hit: ' + filePath);
      return compiled;
    }

    // load, parse & compile
    const src       = FileUtils.loadFile(filePath);
    const buf    = new Parser().parse(src);
    compiled        = new Compiler().compile(buf);

    // console.log(compiled.toString())

    if (config.cache && compiled) {
      this.put(filePath, compiled);
    }
    return compiled;
  }
};

const Cache = new Cache();
*/

class Compiler {

  constructor() {
    this.i  =   0;
    this.r  = `var r='',l=l||{},c=c||{ctx:[]};`;
    this.r += 'var a=s?function(x){s.write(String(x))}:function(x){r+=x};';
  }

  // compile buffer
  compBuf(buf) {
    // precompile, for content functions
    // buf.forEach(block => {
    //   if (block.type === '<') {
    //     this.r += `c._${block.tag}=function(){var r='';`;
    //     this.r += 'var a=s?function(x){s.write(String(x))}:function(x){r+=x};';
    //     this.compBuf(block.buf);
    //     this.r += 'return r;};';
    //   }
    // });

    //
    buf.forEach(b => {
      if (b.type === 'r') {
        // reference
        this.r += `a(${this._getRef(b)});`;
      // } else if (block.type === '+' && !b.tag) {
      //   // insert body (invoke content function)
      //   this.r += `if(c._$body){a(c._$body());c._$body=null;}`;
      // } else if (block.type === '+') {
      //   // insert content (invoke content function)
      //   this.r += `if(c._${block.tag}){a(c._${block.tag}())}`;
      //   if (block.buf) {
      //     this.r += 'else{';
      //     this.compBuf(block.buf);
      //     this.r += '}';
      //   }
      } else if (b.type === '?' || b.type === '!' ) {
        // conditional block
        const not = b.type === '!' ? '!' : '';
        this._pushC();
        this.r += `if(${not}u.b(${this._val(b.tag)})){`;
        this.compBuf(b.buf);
        this.r += '}';
        this._else(b);
        this._popC();
      } else if (b.type === '#') {
        // loop block
        this.i = this.i + 1;
        const { i } = this;
        this._pushC(true);
        this.r += `var a${i}=u.a(${this._val(b.tag)});`;
        this.r += `if(a${i}){`;
        if (!b.buf) {
          this.r += `a(a${i})`;
        } else {
          // const it = block.params.it && stripDoubleQuotes(block.params.it);
          this.r += `l.$length=a${i}.length;`; // cur array length
          this.r += `for(var i${i}=0;i${i}<a${i}.length;i${i}++){`;
          // if (it) {
          //   this.r += `l.${it}=a${i}[i${i}];`;
          // }
          this.r += `l._it=a${i}[i${i}];`;
          this.r += `l.$idx=i${i};`; // cur id
          this.compBuf(b.buf, true);
          this.r += '}';
        }
        this.r += '}';
        this._else(b);
        this._popC(true);
      } else if (b.type === '@') { // if check
        this.i = this.i + 1;
        const { i } = this;
        // this.r += `var h${i}=u.h('${b.tag}',${this._getParams(b.params)},l);`;
        this.r += `var h${i}=u.c('${b.method}',${this._val(b.params.key)},${b.params.value},l);`;
        this.r += `if(h${i}){`;
        if (b.buf) {
          this.compBuf(b.buf);
        } else {
          this.r += `a(h${i});`;
        }
        this.r += '}';
        this._else(b);
      } else if (!b.type){
        // default: raw text
        this.r += `a('${b}');`;
      }
    });
  }

  //
  compile(buf) {
    this.compBuf(buf);
    this.r += 'return r;';
    // console.log(this.r);
    return new Function('l', 'u', 'c', 's', this.r);
  }

  _else(b) {
    if (b.bods && b.bods.else) {
      this.r += 'else{';
      this.compBuf(b.bods.else);
      this.r += '}';
    }
  }

  _pushC(isArray) {
    const { i } = this;
    this.r += `var ctx${i}={};`;
    // Object.keys(params).forEach(key => {
    //   if (key === '$') {
    //     return;
    //   }
    //   this.r += `ctx${i}.${key}=l.${key};`;
    //   this.r += `l.${key}=${this._getParam(params[key])};`;
    // });
    if (isArray) {
      this.r += `ctx${i}._it=l._it;`;
      this.r += `ctx${i}.idx=l.$idx;`;
      // this.r += `ctx${i}.length=l.$length;`;
    }

    this.r += `c.ctx.push(ctx${i});`;
  }

  _popC(isArray) {
    const { i } = this;
    this.r += `var p_ctx${i}=c.ctx.pop();`;
    // Object.keys(params).forEach(key => {
    //   if (key === '$') {
    //     return;
    //   }
    //   this.r += `l.${key}=p_ctx${i}.${key};`;
    // });
    if (isArray) {
      this.r += `l._it=p_ctx${i}._it;`;
      this.r += `l.$idx=p_ctx${i}.idx;`;
      // this.r += `l.$length=p_ctx${i}.length;`;
    }
  }

  //
  _val(tag, utilFn='u.v') {

    if (!isNaN(tag)) {
      return tag;
    }

    // . notation
    if (tag === '.') {
      return 'l._it';
    } else if (tag[0] === '.') {
      tag = '_it' + tag;
    }

    const els = [];
    let i, c, sub = false, idx = 0;
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
        els.push('[' + this._val(tag.substring(idx, i)) + ']');
        sub = false;
        idx = i + 1;
      }
    }

    // last part
    if (i > idx) {
      els.push(tag.substring(idx, i));
    }

    // build string
    let cur = 'l', ret = [];
    els.forEach((el) => {
      if (el[0] === '[') {
        cur += el;
      } else {
        cur += '.' + el;
      }
      ret.push(cur);
    });

    // use utilFn (u.v by default) to invoke function on last el
    if (ret.length === 1) {
      return `${utilFn}(${ret[0]},null,l)`;
    }
    const _this = ret.slice(0,-1);
    return `${utilFn}(${ret.join('&&')},${_this.join('&&')},l)`;

  }

  // _getParam(param) {
  //   if (param[0] === '"') {
  //     // string
  //     let ret = [], match, index = 0, s;

  //     param = stripDoubleQuotes(param);
  //     if (!param) {
  //       // empty string
  //       return '\'\'';
  //     }

  //     // replace references in string
  //     const ref = new RegExp('\\{([^\\}]*)\\}', 'msg');
  //     while ((match = ref.exec(param)) !== null) {
  //       // left part
  //       ret.push(`'${param.substring(index, match.index)}'`);
  //       index = match.index + match[0].length;
  //       ret.push(this._val(match[1], 'u.d'));
  //     }
  //     // final right part
  //     if (index < param.length) {
  //       s = param.substring(index, param.length);
  //       // escape single quotes
  //       s = s.replace(/'/g, '\\\'');
  //       ret.push(`'${s}'`);
  //     }
  //     return ret.join('+');
  //   }

  //   if (!isNaN(param)) {
  //     return param;
  //   }

  //   // ref
  //   return this._val(param);
  // }

  // _getParams(params) {
  //   let ret = '{';
  //   for (let key in params) {
  //     ret += `${key}:${this._getParam(params[key])},`;
  //   }
  //   ret += '}';
  //   return ret;
  // }

  _getRef(b) {
    let ret = this._val(b.tag, 'u.d');
    if (!b.f) {
      return ret;
    }
    b.f.forEach(f => {
      ret = `u.f.${f}(${ret})`;
    });
    return ret;
  }

}

// render template
// module.exports.render = (src, data, res) => {
//   const buf = new Parser().parse(str);
//   const compiled = new Compiler().compile(buf);
//   return this.renderCompiled(compiled, data, res);
// };

// render template file
module.exports.compile = (src) => {
  return new Compiler().compile(new Parser().parse(src));
};

module.exports.renderCompiled = function(compiled, data, res) {
  return compiled(data, Utils, null, res);
}

var template = `
  Hello {@if foo == 'bar'}is bar!{:else}not bar {/}
  {html|raw}
`

fn = module.exports.compile(template)
// console.log('compiled', fn.toString())
var res = module.exports.renderCompiled(fn, { foo: 'bar', html: '<script>asdas</script>' });
console.log(res)