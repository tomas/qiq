var Minstache = (function() {

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

  function section(obj, prop, negate, thunk) {
    var val = obj[prop];
    if (Array.isArray(val)) {
      if (negate) {
        return val.length ? '' : thunk(obj);
      } else {
        return val.map(thunk).join('');
      }
    }
    if ('function' == typeof val) return val.call(obj, thunk(obj));
    if (negate) val = !val;
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

    if (opts.delimiter) delimiter = opts.delimiter;

    var fn = opts.key && templates[opts.key] || compile(str, opts.escapeNewLines);
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

  function compile(str, escapeNewLines) {
    var js      = [];
    var toks    = parse(str);
    var tok;
    var conds   = {};
    var levels  = [];
    var lineEnd = escapeNewLines ? '\\\\\\n' : '\\n';

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
              js.push(' }) + ');
              levels.pop();
              delete(conds[tok]);
            }
            break;
          case '^':
            tok = tok.slice(1);
            levels.push(tok);
            assertProperty(tok);
            assertUndefined(conds[tok]);
            conds[tok] = false;
            js.push(' + ' + section_func + '(obj, "' + tok + '", true, function(obj){ return ');
            break;
          case '#':
            tok = tok.slice(1);
            levels.push(tok)
            assertProperty(tok);
            assertUndefined(tok, conds[tok]);
            conds[tok] = true;
            js.push(' + ' + section_func + '(obj, "' + tok + '", false, function(obj){ return ');
            break;
          case '!':
            tok = tok.slice(1);
            assertProperty(tok);
            js.push(' + obj.' + tok + ' + ');
            break;
          case '_':
            tok = tok.slice(1);
            if (tok == '' || tok == 'else') tok = levels[levels.length-1]; // assume last one
            js.push(' }) + ' + section_func + '(obj, "' + tok + '", ' + conds[tok] + ', function(obj){ return ');
            break;
            default:
              assertProperty(tok);
              js.push(' + ' + escape_func + '(obj.' + tok + ') + ');
          }
        }
      }

      js = '\n'
        + indent(escape.toString()) + ';\n\n'
        + indent(section.toString()) + ';\n\n'
        + '  return ' + js.join('').replace(/\r?\n/g, lineEnd);

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
   * Parse `str`.
   *
   * @param {String} str
   * @return {Array}
   * @api private
   */

  function parse(str) {
    return str.split(delimiter);
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
  exports = module.exports = Minstache.render;
  exports.compile = Minstache.compile;

}