var qiq = (function() {

  var last;
  var templates = {};
  var delimiter = /\{\{ ?| ?\}\}/;

  /**
   * Section handler.
   *
   * @param {Object} context obj
   * @param {String} prop
   * @param {Function} thunk
   * @param {Boolean} negate
   * @api private
   */

  function section(obj, prop, type, thunk) {

    // if type is 2 or 3, then this is an else block from a previous
    // truthy or falsy block. if that block was successful, then we
    // can skip the logic altogether by checking the last return val.
    if (type > 1) {
      if (last) {
        last = null;
        return '';
      }
    }

    var res, val = obj[prop];
    if (Array.isArray(val)) {
      if (type > 4) { // 5, 6
        res = val.length ? thunk(obj) : '';
      } else if (type > 0 && type < 3) { // 1, 2
        res = val.length ? val.map(thunk).join('') : thunk(val);
      } else {
        res = val.length ? '' : thunk(obj);
      }
    } else if (val && val.constructor === Object) {
      if (type > 4) {
        res = (type == 6 && val || type == 7 || !val) ? '' : thunk(obj);
      } else if (type == 1) {
        res = thunk(val); // descend
      } else {
        res = ((type == 0 || type == 3) && val) ? '' : thunk(obj);
      }
    }

    if (res !== undefined) return res;

    // allow calling functions that might return true or false
    // otherwise just return the result of that function
    if ('function' == typeof val) {
      var val = val.call(obj, thunk(obj));
      if (typeof val != 'boolean') return val;

      if (!val && type === 2) val = !val;
    }

    if (type === 0 || type === 3 || type == 4 || type == 7) val = !val;
    last = val;

    if (val) return thunk(obj);
    return '';
  }

  /**
   * Escape the given `html`.
   *
   * @param {String} html
   * @return {String}
   * @api private
   */

  function escape(html) {
    return String(html)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Render the given mustache `str` with `obj`.
   *
   * @param {String} str
   * @param {Object} obj
   * @return {String}
   * @api public
   */

  function render(str, obj, opts) {
    obj  = obj  || {};
    opts = opts || {};

    var fn = opts.key && templates[opts.key] || compile(str, opts);
    if (opts.key && !templates[opts.key]) templates[opts.key] = fn;

    return fn(obj);
  }

  /**
   * Compile the given `str` to a `Function`.
   *
   * @param {String} str
   * @return {Function}
   * @api public
   */

  function compile(str, opts) {
    opts = opts || {};
    var tok, type, js = [], conds = {}, levels = [];

    var toks         = str.split(opts.delimiter || delimiter);
    var lineEnd      = opts.escapeNewLines ? '\\\\\\n' : '\\n';

    // get function names dynamically, so they work even if mangled
    var escape_func  = escape.name;
    var section_func = section.name;

    for (var i = 0; i < toks.length; ++i) {
      tok = toks[i];
      if (i % 2 == 0) {
        js.push('"' + tok.replace(/"/g, '\\\"') + '"');
      } else {
        switch (tok[0]) {
          case '/':
            tok = tok.slice(1);
            if (tok == '' || levels[levels.length-1] == tok) {
              js.push('})+');
              levels.pop();
              delete(conds[tok]);
            }
            break;
          case '^':
            tok = tok.slice(1), type = 0;
            if (tok.substr(-1) == '?') {
              type = 4;
              tok = tok.substring(0, tok.length-1);
            }
            levels.push(tok);
            assertProperty(tok);
            assertUndefined(conds[tok]);
            conds[tok] = type;
            js.push('+' + section_func + '(obj,"' + tok + '",' + type + ',function(obj){return ');
            break;
          case '#':
            tok = tok.slice(1), type = 1;
            if (tok.substr(-1) == '?') {
              type = 5;
              tok = tok.substring(0, tok.length-1);
            }
            levels.push(tok)
            assertProperty(tok);
            assertUndefined(tok, conds[tok]);
            conds[tok] = type;
            js.push('+' + section_func + '(obj,"' + tok + '",' + type + ',function(obj){return ');
            break;
          case '!':
            tok = tok.slice(1);
            assertProperty(tok);
            js.push('+obj.' + tok + '+');
            break;
          case '_':
            tok = tok.slice(1);
            if (tok == '' || tok == 'else') tok = levels[levels.length-1]; // assume last one
            type = conds[tok] + 2;
            js.push('})+' + section_func + '(obj,"' + tok + '",' + type + ',function(obj){return ');
            break;
            default:
              assertProperty(tok);
              tok = tok == 'this' ? '' : '.' + tok;
              js.push('+' + escape_func + '(obj' + tok + ')+');
          }
        }
      }

      js = '\n'
        + indent('var last;') + '\n'
        + indent(escape.toString()) + ';\n\n'
        + indent(section.toString()) + ';\n\n'
        + ' return ' + js.join('').replace(/\r?\n/g, lineEnd);

      return new Function('obj', js);
    }

  /**
   * Assert that `prop` is a valid property.
   *
   * @param {String} prop
   * @api private
   */

  function assertProperty(prop) {
    if (!prop.match(/^[\w.\[\]\"\\']+$/)) throw new Error('invalid property "' + prop + '"');
  }

  /**
   * Assert that `prop` is undefined.
   *
   * @param {String} prop
   * @api private
   */

  function assertUndefined(prop, value) {
    if (typeof value != 'undefined') throw new Error('trying to overwrite existing conditional for "' + prop + '"');
  }

  /**
   * Indent `str`.
   *
   * @param {String} str
   * @return {String}
   * @api private
   */

  function indent(str) {
    return str.replace(/^/gm, '  ');
  }

  return { render: render, compile: compile };

})();

if (typeof module !== 'undefined' && module.exports) {

  /**
   * Expose `render()` and `compile()`.
   */
  exports = module.exports = qiq.render;
  exports.compile = qiq.compile;

}