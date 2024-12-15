const config = {
  cache: false,
  views: './views',
  htmlencode: true,
  htmltrim: true,
}

const truthTest = (tag, test) => {
  return (params, locals) => test(params.key, params.value);
};

const Helpers = {
  eq:   truthTest('eq',   (left, right) => left === right ),
  ne:   truthTest('ne',   (left, right) => left !== right ),
  lt:   truthTest('lt',   (left, right) => Number(left) <   Number(right)),
  lte:  truthTest('lte',  (left, right) => Number(left) <=  Number(right)),
  gt:   truthTest('gt',   (left, right) => Number(left) >   Number(right)),
  gte:  truthTest('gte',  (left, right) => Number(left) >=  Number(right)),

  first:  (params, locals) => locals.$idx === 0,
  last:   (params, locals) => locals.$length && locals.$length - 1 === locals.$idx,
  sep:    (params, locals) => locals.$length && locals.$length - 1 !== locals.$idx,

  select: () => console.log('Error : @select not supported !'),
};

var Utils = (function() {

  // special chars
  const HCHARS  = /[&<>"']/,
    AMP     = /&/g,
    LT      = /</g,
    GT      = />/g,
    QUOT    = /"/g,
    SQUOT   = /'/g;

  const BS      = /\\/g,
    FS      = /\//g,
    CR      = /\r/g,
    LS      = /\u2028/g,
    PS      = /\u2029/g,
    NL      = /\n/g,
    LF      = /\f/g,
    SQ      = /'/g,
    DQ      = /"/g,
    TB      = /\t/g;


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

  // Filters
  const f = {
    h:          htmlencode,
    j:          escapeJs,
    u:          encodeURI,
    uc:         encodeURIComponent,
    js:         stringifyJson,
    jp:         JSON.parse,
    uppercase:  s => s.toUpperCase(),
    lowercase:  s => s.toLowerCase(),
  };


  // return value to be displayed
  const d = (s, t, l) => {
    if (typeof s === 'function') {
      return s.call(t, l);
    }
    if (s === null || s === undefined) {
      return '';
    }
    return s;
  };

  // return value (if it's a function, invoke it with locals)
  const v = (s, t, l) => {
    if (typeof s === 'function') {
      return s.call(t, l);
    }
    return s;
  };

  // return boolean
  const b = (v) => {
    if (!v) {
      return false;
    }
    if (v.length === 0) {
      return false;
    }
    return true;
  };

  // return array
  const a = (v) => {
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
  };

  // helpers
  const h = (t, p, l) => {
    if (!h.helpers || !h.helpers[t]) {
      throw new Error(`Error: helper @${t} not found!`);
    }
    return h.helpers[t](p, l);
  };

  h.helpers = Helpers;

  // include file
  // const i = (file) => {
  //   if (!file.endsWith('.dust')) {
  //     file = file + '.dust';
  //   }
  //   return Cache.getCompiled(file);
  // };

  // const Utils = { a, b, v, d, h, f };
  return { a, b, v, d, h, f };

})()

var ParseUtils = (function() {

  // remove spaces and double quotes
  function cleanStr(s) {
    const regexp = /["]*(.[^"]*)/;
    const match  = regexp.exec(s);
    return match && match[1];
  };

  // strip comments
  function removeComments(str) {
    let index = 0;
    let openCommentMatch, closeCommentMatch;

    const openCommentRegexp   = new RegExp('{!', 'msg');
    const closeCommentRegexp  = new RegExp('!}', 'msg');

    // find opening '{!'
    while ((openCommentMatch = openCommentRegexp.exec(str)) !== null) {
      index = openCommentMatch.index + 2;
      // find closing '!}'
      closeCommentRegexp.lastIndex = index;
      while ((closeCommentMatch = closeCommentRegexp.exec(str)) !== null) {
        str = str.slice(0, openCommentMatch.index) + str.slice(closeCommentMatch.index + 2);
        break;
      };
    }

    return str;
  };

  // remove spaces and double quotes
  function stripDoubleQuotes(s) {
    const regexp = new RegExp('"', 'sg');
    return s.replace(regexp, '');
  };

  //
  function parseTag(s) {
    const i = s.indexOf(' ');
    if (i >= 0) {
      s = s.substring(0, i);
    }
    return s.substring(1);
  };

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

  return {
    cleanStr: cleanStr,
    removeComments: removeComments,
    stripDoubleQuotes: stripDoubleQuotes,
    parseTag: parseTag,
    parseParams: parseParams,
  }

})()

var Tags = (function() {

  const _if = (parser, block) => {
    parser.pushBlock(block);
    parser.stackBlock(block);
  };

  const _loop = (parser, block) => {
    parser.pushBlock(block);
    if (!block.selfClosedTag) {
      parser.stackBlock(block);
    }
  };

  const _not = (parser, block) => {
    parser.pushBlock(block);
    parser.stackBlock(block);
  };

  const _helper = (parser, block) => {
    parser.pushBlock(block);
    if (!block.selfClosedTag) {
      parser.stackBlock(block);
    }
  };

  const ALLOWED_BODIES = [ 'else' ];
  const _body = (parser, block) => {
    if (ALLOWED_BODIES.indexOf(block.tag) === -1) {
      throw new Error(`Unexpected tag {${block.type}${block.tag}..`)
    }
    parser.addBody(block.tag);
  };

  const _end = (parser, block) => {
    const opening = parser.pop();
    if (opening && opening.type !== '>' && opening.tag !== block.tag)  {
      console.error(`Open/close tag mismatch! '${opening.tag}' <> '${block.tag}'`);
    }
  };

  const _content = (parser, block) => {
    parser.pushBlock(block);
    parser.stackBlock(block);
  };

  const _include = (parser, block) => {
    block.file = block.params.$;
    parser.pushBlock(block);
    if (!block.selfClosedTag) {
      parser.stackBlock(block);
    }
  };

  const _insert = (parser, block) => {
    parser.pushBlock(block);
    if (!block.selfClosedTag) {
      parser.stackBlock(block);
    }
  };

  const SPECIALS = {
    s   : ' ',
    n   : '\\n',
    r   : '\\r\\n',
    lb  : '{',
    rb  : '}',
  };

  const _special = (parser, block) => {
    if (SPECIALS[block.tag]){
      parser.pushBlock(SPECIALS[block.tag]);
    }
  };

  return {
    '?': _if,
    '#': _loop,
    '^': _not,
    '@': _helper,
    ':': _body,
    '/': _end,
    '>': _include,
    '<': _content,
    '+': _insert,
    '~': _special,
  };

})()


class Parser {

  constructor() {
    this.global     = [];           // global buffer, to be returned by parse function
    this.buffer     = this.global;  // current buffer, where content is added
    this.stack      = [];           // stack of parents blocks
    this.contents   = {};           // contents to be replaced in layouts
  }

  // add string
  pushString(str) {
    if (config.htmltrim) {
      // remove line returns and following spaces
      str = str.replace(/[\r\n]+\s*/g , '');
      // escape backslashes
      str = str.replace(/\\/g, '\\\\');
    }

    // escape single quotes
    str = str.replace(/'/g, '\\\'');

    const i     = this.buffer.length - 1;
    const last  = this.buffer[i];

    // concat with previous string buffer
    if (typeof last === 'string') {
      this.buffer[i] = last + str;
      return;
    }

    // push
    this.buffer.push(str);
  }

  // push block
  pushBlock(block) {
    this.buffer.push(block);
  }

  // stack the block, use its buffer as current
  stackBlock(block)  {
    block.buffer  = [];
    block.current = block.buffer;
    this.buffer   = block.buffer;
    this.stack.push(block);
  }

  getLastBlock() {
    return this.stack[this.stack.length-1];
  }

  pop() {
    const block = this.stack.pop();
    const last  = this.getLastBlock();
    this.buffer = last && last.current || this.global;
    return block;
  }

  addBody(tag) {
    const last = this.getLastBlock();
    if (!last) {
      throw new Error('Cannot add body outside of a block');
    }
    last.bodies       = last.bodies || {};
    last.bodies[tag]  = [];
    last.current      = last.bodies[tag];
    this.buffer       = last.bodies[tag];
  }

  parse(str) {
    // remove spaces at the beginning of lines and line breaks
    if (config.htmltrim) {
      str = str.replace(/^\s+/g, '');
    } else {
      str = str.replace(/\r/g , '\\r').replace(/\n/g , '\\n');
    }

    // remove comments
    str = ParseUtils.removeComments(str);

    const openRegexp   = new RegExp('(.*?)\\{', 'msg');
    const closeRegexp  = new RegExp('(.*?)\\}', 'msg');

    let index = 0;

    // find opening '{'
    let openMatch, closeMatch;
    while ((openMatch = openRegexp.exec(str)) !== null) {
      if (openMatch[1]) {
        // preceding string
        this.pushString(openMatch[1]);
      }
      index = openMatch.index + openMatch[0].length;

      // find closing '}'
      let tag = '';
      closeRegexp.lastIndex = index;
      while ((closeMatch = closeRegexp.exec(str)) !== null) {
        tag += closeMatch[1];
        // skip when closing an internal '{'
        if (closeMatch[1].lastIndexOf('{') === -1) {
          break;
        }
        tag += '}';
      }

      if (!closeMatch) {
        // parsing error
        throw new Error(`Missing closing "}" at index ${index}`);
      }

      index = closeMatch.index + closeMatch[0].length;
      openRegexp.lastIndex = index;

      if (!this.parseTag(tag)) {
        // tag is ignored: push content to buffer
        this.pushString(`{${tag}}`);
      }
    }

    // stack should be empty
    if (this.stack.length > 0) {
      throw new Error(`Missing closing tag for {${this.stack[0].type}${this.stack[0].tag}...`);
    }

    if (index < str.length) {
      this.pushString(str.slice(index));
    }

    // console.log('--- done ---');
    // console.dir(this);
    return this.global;
  }

  // parse tag. returns true if tag was found
  parseTag(str) {

    const tag = Tags[str[0]];

    const block = {
      type: str[0],
      tag:  str,
    };

    if (!tag) {
      // skip this tag if it's not correct
      if (str.indexOf(' ') >= 0 || str.indexOf('(') >= 0 || str.indexOf(';') >= 0) {
        return false;
      }
      // reference
      block.type = 'r';
      this.parseFilters(str, block);
      this.pushBlock(block);
      return true;
    }

    // set self closing tag
    if (str.endsWith('/')) {
      block.selfClosedTag = true;
      str = str.substring(0, str.length - 1);
    }

    // remove first char
    block.tag = ParseUtils.parseTag(str);

    // parse params
    block.params = ParseUtils.parseParams(str);

    // invoke tag function
    tag(this, block);

    return true;
  }

  parseFilters(str, block) {
    // parse filters
    const filtersRegexp = new RegExp('([ ]*\\|[ ]*\\w+)+', 'g');
    const filtersMatch  = filtersRegexp.exec(str);
    if (filtersMatch) {
      block.tag = str.substring(0, filtersMatch.index);
      const f   = filtersMatch[0].replace(/ /g, '').substring(1).split('|');
      const s   = f.indexOf('s');
      if (s > -1) {
        f.splice(s, 1);
      } else if (config.htmlencode) {
        f.push('h');
      }
      block.f = f;
    } else if (config.htmlencode) {
      block.f = ['h'];
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
    const buffer    = new Parser().parse(src);
    compiled        = new Compiler().compile(buffer);

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

  compileBuffer(buffer) {
    // precompile, for content functions
    buffer.forEach(block => {
      if (block.type === '<') {
        this.r += `c._${block.tag}=function(){var r='';`;
        this.r += 'var a=s?function(x){s.write(String(x))}:function(x){r+=x};';
        this.compileBuffer(block.buffer);
        this.r += 'return r;};';
      }
    });

    //
    buffer.forEach(block => {
      if (block.type === 'r') {
        // reference
        this.r += `a(${this._getReference(block)});`;
      } else if (block.type === '+' && !block.tag) {
        // insert body (invoke content function)
        this.r += `if(c._$body){a(c._$body());c._$body=null;}`;
      } else if (block.type === '+') {
        // insert content (invoke content function)
        this.r += `if(c._${block.tag}){a(c._${block.tag}())}`;
        if (block.buffer) {
          this.r += 'else{';
          this.compileBuffer(block.buffer);
          this.r += '}';
        }
      } else if (block.type === '?' || block.type === '^' ) {
        // conditional block
        const not = block.type === '^' ? '!' : '';
        this._pushContext(block.params);
        this.r += `if(${not}u.b(${this._getValue(block.tag)})){`;
        this.compileBuffer(block.buffer);
        this.r += '}';
        this._else(block);
        this._popContext(block.params);
      } else if (block.type === '#') {
        // loop block
        this.i = this.i + 1;
        const { i } = this;
        this._pushContext(block.params, true);
        this.r += `var a${i}=u.a(${this._getValue(block.tag)});`;
        this.r += `if(a${i}){`;
        if (!block.buffer) {
          this.r += `a(a${i})`;
        } else {
          const it = block.params.it && ParseUtils.stripDoubleQuotes(block.params.it);
          this.r += `l.$length=a${i}.length;`; // current array length
          this.r += `for(var i${i}=0;i${i}<a${i}.length;i${i}++){`;
          if (it) {
            this.r += `l.${it}=a${i}[i${i}];`;
          }
          this.r += `l._it=a${i}[i${i}];`;
          this.r += `l.$idx=i${i};`; // current id
          this.compileBuffer(block.buffer, true);
          this.r += '}';
        }
        this.r += '}';
        this._else(block);
        this._popContext(block.params, true);
      } else if (block.type === '@') {
        // helper
        this.i = this.i + 1;
        const { i } = this;
        this.r += `var h${i}=u.h('${block.tag}',${this._getParams(block.params)},l);`;
        this.r += `if(h${i}){`;
        if (block.buffer) {
          this.compileBuffer(block.buffer);
        } else {
          this.r += `a(h${i});`;
        }
        this.r += '}';
        this._else(block);
      } else if (block.type === '>') {
        // include

        // precompile if buffer
        if (block.buffer) {
          this.r += `c._$body=function(){var r='';`;
          this.r += 'var a=s?function(x){s.write(String(x))}:function(x){r+=x};';
          this.compileBuffer(block.buffer);
          this.r += 'return r;};';
        }

        this._pushContext(block.params);
        const file = this._getParam(block.file);
        this.r += `a(u.i(${file})(l,u,c,s));`;
        this._popContext(block.params);
      } else if (!block.type){
        // default: raw text
        this.r += `a('${block}');`;
      }
    });
  }

  //
  compile(buffer) {
    this.compileBuffer(buffer);
    this.r += 'return r;';
    // console.log(this.r);
    return new Function('l', 'u', 'c', 's', this.r);
  }

  _else(block) {
    if (block.bodies && block.bodies.else) {
      this.r += 'else{';
      this.compileBuffer(block.bodies.else);
      this.r += '}';
    }
  }

  _pushContext(params, isArray) {
    const { i } = this;
    this.r += `var ctx${i}={};`;
    Object.keys(params).forEach(key => {
      if (key === '$') {
        return;
      }
      this.r += `ctx${i}.${key}=l.${key};`;
      this.r += `l.${key}=${this._getParam(params[key])};`;
    });
    if (isArray) {
      this.r += `ctx${i}._it=l._it;`;
      this.r += `ctx${i}.idx=l.$idx;`;
      this.r += `ctx${i}.length=l.$length;`;
    }

    this.r += `c.ctx.push(ctx${i});`;
  }

  _popContext(params, isArray) {
    const { i } = this;
    this.r += `var p_ctx${i}=c.ctx.pop();`;
    Object.keys(params).forEach(key => {
      if (key === '$') {
        return;
      }
      this.r += `l.${key}=p_ctx${i}.${key};`;
    });
    if (isArray) {
      this.r += `l._it=p_ctx${i}._it;`;
      this.r += `l.$idx=p_ctx${i}.idx;`;
      this.r += `l.$length=p_ctx${i}.length;`;
    }
  }


  //
  _addParamsToLocals(params) {
    const { i } = this;
    Object.keys(params).forEach(key => {
      if (key === '$') {
        return;
      }
      this.r += `c.p_${key}${i}=l.${key};`;
      this.r += `l.${key}=${this._getParam(params[key])};`;
    });
  }

  //
  _cleanParamsFromLocals(params) {
    const { i } = this;
    Object.keys(params).forEach(key => {
      if (key === '$') {
        return;
      }
      this.r += `l.${key}=c.p_${key}${i};`;
      this.r += `delete c.p_${key}${i};`;
    });
  }

  _getParam(param) {
    if (param[0] === '"') {
      // string
      let ret = [], match, index = 0, s;

      param = ParseUtils.stripDoubleQuotes(param);
      if (!param) {
        // empty string
        return '\'\'';
      }

      // replace references in string
      const ref = new RegExp('\\{([^\\}]*)\\}', 'msg');
      while ((match = ref.exec(param)) !== null) {
        // left part
        ret.push(`'${param.substring(index, match.index)}'`);
        index = match.index + match[0].length;
        ret.push(this._getValue(match[1], 'u.d'));
      }
      // final right part
      if (index < param.length) {
        s = param.substring(index, param.length);
        // escape single quotes
        s = s.replace(/'/g, '\\\'');
        ret.push(`'${s}'`);
      }
      return ret.join('+');
    }

    if (!isNaN(param)) {
      return param;
    }

    // ref
    return this._getValue(param);
  }

  //
  _getValue(tag, utilFn='u.v') {

    if (!isNaN(tag)) {
      return tag;
    }

    // . notation
    if (tag === '.') {
      return 'l._it';
    } else if (tag[0] === '.') {
      tag = '_it' + tag;
    }

    const elements = [];
    let i, c, sub = false, idx = 0;
    // parse ref
    for (i = 0; i < tag.length; i = 1 + i) {
      c = tag[i];
      if (!sub && (c === '.' || c === '[')) {
        if (i > idx) {
          elements.push(tag.substring(idx, i));
        }
        idx = i + 1;
        sub = (c === '[');
      } else if (c === ']') {
        elements.push('[' + this._getValue(tag.substring(idx, i)) + ']');
        sub = false;
        idx = i + 1;
      }
    }

    // last part
    if (i > idx) {
      elements.push(tag.substring(idx, i));
    }

    // build string
    let current = 'l', ret = [];
    elements.forEach((element) => {
      if (element[0] === '[') {
        current += element;
      } else {
        current += '.' + element;
      }
      ret.push(current);
    });

    // use utilFn (u.v by default) to invoke function on last element
    if (ret.length === 1) {
      return `${utilFn}(${ret[0]},null,l)`;
    }
    const _this = ret.slice(0,-1);
    return `${utilFn}(${ret.join('&&')},${_this.join('&&')},l)`;

  }

  _getParams(params) {
    let ret = '{';
    for (let key in params) {
      ret += `${key}:${this._getParam(params[key])},`;
    }
    ret += '}';
    return ret;
  }

  _getReference(block) {
    let ret = this._getValue(block.tag, 'u.d');
    if (!block.f) {
      return ret;
    }
    block.f.forEach(f => {
      ret = `u.f.${f}(${ret})`;
    });
    return ret;
  }

}

// render template
module.exports.render = (src, data, res) => {
  const buffer = new Parser().parse(str);
  const compiled = new Compiler().compile(buffer);
  return this.renderCompiled(compiled, data, res);
};

// render template file
module.exports.compile = (src) => {
  const buffer = new Parser().parse(src);
  return new Compiler().compile(buffer);
};

module.exports.renderCompiled = function(compiled, data, res) {
  return compiled(data, Utils, null, res);
}

// Helpers and filters
module.exports.helpers = Helpers;
module.exports.filters = Utils.f;
