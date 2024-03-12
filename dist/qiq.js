var qiq = (function() {

  var templates = {};
  var delimiter = /\{\{ ?| ?\}\}/;

  function functionName(fn) {
    return fn.name || (fn.toString().match(/function (.+?)\(/)||[,''])[1];
  }

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

    // var obj = obj.constructor === Object ? flatten(obj) : obj;
    var val = obj[prop];

    if (type == 4) { // truthy check
      section.last = val;
      return !val || val.length !== undefined && !val.length ? '' : thunk(obj);
    }

    // if type is 2 or 3, then this is an else block from a previous
    // truthy or falsy block. if that block was successful, then we
    // can skip the logic altogether by checking the last return val.
    if (type > 1) {
      if (section.last && (!Array.isArray(section.last) || section.last.length)) {
        section.last = null;
        return '';
      }
    }

    if (Array.isArray(val)) {
      if (type % 3 == 0) { // 0 or 3
        return val.length ? '' : thunk(obj);
      } else {
        return type == 1 ? val.map(thunk).join('') : thunk(val);
      }
    } else if (type == 1 && val && val.constructor === Object) {
      return thunk(val); // descend
    }

    // allow calling functions that might return true or false
    // otherwise just return the result of that function
    if ('function' == typeof val) {
      var val = val.call(obj, thunk(obj));
      if (typeof val != 'boolean') return val;

      if (!val && type === 2) val = !val;
    }

    if (type % 3 === 0) val = !val;
    section.last = val;

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
    var escape_func  = functionName(escape);
    var section_func = functionName(section);

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
            levels.push(tok);
            assertProperty(tok);
            assertUndefined(tok, conds[tok]);
            conds[tok] = type;
            js.push('+' + section_func + '(o,"' + tok + '",' + type + ',function(o,i){return ');
            break;
          case '#':
            tok = tok.slice(1), type = 1;
            levels.push(tok)
            assertProperty(tok);
            assertUndefined(tok, conds[tok]);
            conds[tok] = type;
            js.push('+' + section_func + '(o,"' + tok + '",' + type + ',function(o,i){return ');
            break;
          case '!':
            tok = tok.slice(1);
            assertProperty(tok);
            js.push('+o.' + tok + '+');
            break;
          case '_':
            tok = tok.slice(1);
            if (tok == '' || tok == 'else') tok = levels[levels.length-1]; // assume last one
            type = conds[tok] + 2;
            js.push('})+' + section_func + '(o,"' + tok.replace(/\?$/, '') + '",' + type + ',function(o,i){return ');
            break;
          default:
            if (tok.slice(-1) == '?') {
              type = 4;
              levels.push(tok);
              // assertProperty(tok);
              assertUndefined(tok, conds[tok]);
              conds[tok] = type;
              js.push('+' + section_func + '(o,"' + tok.slice(0, -1) + '",' + type + ',function(o){return ');
            } else {
              assertProperty(tok);
              tok = tok == 'this' ? 'o' : (tok == 'i' ? 'i' : 'o.' + tok);
              js.push('+' + escape_func + '(' + tok + ')+');
            }
          }
        }
      }

      js = '\n'
        + indent(escape.toString()) + ';\n\n'
        + indent(section.toString()) + ';\n\n'
        // + indent(flatten.toString()) + ';\n\n'
        + ' return ' + js.join('').replace(/\r?\n/g, lineEnd);

      return new Function('o', js);
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
    if (value !== undefined) throw new Error('cannot overwrite existing conditional for "' + prop + '"');
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