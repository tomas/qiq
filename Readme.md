
# qiq

  Minimal templating engine, based on igo-dust

## Installation

    $ npm install qiq

## API

### qiq(string, [obj], [opts])

  Compile and render the given mustache `string` with optional context `obj`.

### qiq.compile(string, [opts])

  Compile the qiq `string` to a stand-alone `Function` accepting a context `obj`.

## Syntax

### Variables

```js
  var qiq = require('qiq');

  var template  = 'Hi {{name}}!';
  qiq(template, { name: 'Tommy' }); // => "Hi Tommy!";

  // nested objects also work
  var template  = 'Hi {{name}}, how is your {{day.name}}?';
  var data      = { name: 'Tommy', day: { name: 'Tuesday' } };
  qiq(template, data); // => "Hi Tommy, how is your Tuesday?";

  // to skip HTML escaping, use a ^ before your variable name
  var template  = 'Good day {{^greeting}}';
  qiq(template, { greeting: '<em>human</em>' }); // => "Good day <em>human</em>";

  // you can also separate brackets and tokens with spaces, like:
  var template  = 'Hi {{ name }}, how are you?';
  qiq(template, { name: 'Jerry' }); // => "Hi Jerry, how are you?";

  // and even use a different delimiter if you want to:
  var template  = 'Howdy <% name %>!';
  var opts      = { delimeter: /\<\% ?| ?\%\>/ };
  qiq(template, { name: 'Jerry' }, opts); // => "Howdy Jerry!";
```

### Conditionals

```js
  // true
  var template  = 'Hello.{{foo?}} Goodbye.{{/foo?}}';
  qiq(template, { foo: true }); // => "Hello. Goodbye.";

  // truthy
  var template  = 'Goodbye.{{number?}} Hello.{{/number?}}';
  qiq(template, { number: 1 }); // => "Goodbye. Hello.";

  // false
  var template  = 'This is {{!bar?}}not {{/bar?}}a test.';
  qiq(template, { bar: false }); // => "This is not a test.";

  // if/else
  var template  = 'Very {{good?}}good{{_else}}bad{{/good?}}.';
  qiq(template, { good: true }); // => "Very good.";

  // if/else reversed
  var template  = 'Such {{!ugly?}}nice{{_else}}ugly{{/ugly?}}!';
  qiq(template, { ugly: false }); // => "Such nice!";

  // nested if/else!
  var template = 'Works? {{!works}}Nope.{{_else}}Yep, {{awesome?}}awesome{{_else}}cool{{/awesome?}}!{{/works}}'
  qiq(template, { works: true, awesome: false }); // => "Works? Yep, cool!";
```

### Functions

Your object can have functions that either return true or false, which are used
to follow the template logic, or return a string in which case that is what is printed.

```js
  var template  = '{{isEmpty?}} is empty {{_else}} not empty {{/isEmpty?}}';
  var obj = { isEmpty: function() { return false } }
  qiq(template, obj); // => "not empty";

  var template  = '{{#toUpper}} these are letters {{/}}';
  var obj = { toUpper: function(thunk) { return thunk.toUpperCase() } }
  qiq(template, obj); // => "THESE ARE LETTERS";
```

### Arrays

```js
  var template = '<ul>{{#contacts}}<li>{{.name}}</li>{{/contacts}}</ul>';
  var list = {
    contacts: [{ name: 'tobi' }, { name: 'loki' }, { name: 'jane' }]
  };
  qiq(template, list); // => "<ul><li>tobi</li><li>loki</li><li>jane</li></ul>";

  var template = '<ul>{{#numbers}}<li>{{.}}</li>{{/contacts}}</ul>';
  var list = {
    numbers: [1,2,3]
  };
  qiq(template, list); // => "<ul><li>1</li><li>2</li><li>3</li></ul>";
```

For more examples check the `test/index.js` file in the repo.

## License

  MIT
