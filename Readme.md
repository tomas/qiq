
# minstache

  Mini mustache template engine.

## Installation

    $ npm install minstache
    $ component install visionmedia/minstache

## minstache(1)

  The `minstache(1)` executable can compile a file to a valid
  stand-alone commonjs module for you, there's no need to have minstache
  as a dependency:

  hello.mustache:

```
Hello {{name}}! {{^authenticated}}<a href="/login">login</a>{{/authenticated}}
```

  convert it:

```
$ minstache < hello.mustache > hello.js
```

Now you can do:

```js
  var hello = require('./hello');
  var str = hello({ name: 'Tom', authenticated: false }); 

  console.log(str); // => "Hello Tom! <a href="/login">login</a>
```
## API

### minstache(string, [obj], [opts])

  Compile and render the given mustache `string` with optional context `obj`.

### minstache.compile(string)

  Compile the mustache `string` to a stand-alone `Function` accepting a context `obj`.

## Syntax

### Variables

```js
  var minstache = require('minstache');

  var template  = 'Hi {{name}}!';
  minstache(template, { name: 'Tommy' }); // => "Hi Tommy!";

  // nested objects also work
  var template  = 'Hi {{name}}, how is your {{day.name}}?';
  var data      = { name: 'Tommy', day: { name: 'Tuesday' } };
  minstache(template, data); // => "Hello Tommy, how is your Tuesday?";

  // you can also separate brackets and tokens with spaces, like:
  var template  = 'Hi {{ name }}, how are you?';
  minstache(template, { name: 'Jerry' }); // => "Hi Jerry, how are you?";

  // and even use a different delimiter if you want to:
  var template  = 'Howdy <% name %>!';
  var opts      = { delimeter: /\<\% ?| ?\%\>/ };
  minstache(template, { name: 'Jerry' }, opts); // => "Hi Jerry, how are you?";
```

### Conditionals

```js

  // true
  var template  = 'Hello.{{#foo}} Goodbye.{{/foo}}';
  minstache(template, { foo: true }); // => "Hello. Goodbye.";

  // truthy
  var template  = 'Goodbye.{{#number}} Hello.{{/number}}';
  minstache(template, { number: 1 }); // => "Goodbye. Hello.";

  // false 
  var template  = 'This is {{^bar}}not{{/bar}}a test.';
  minstache(template, { bar: false }); // => "This is not a test.";

  // if/else
  var template  = 'Very {{#good}}good{{_else}}bad{{/good}}.';
  minstache(template, { good: true }); // => "Very good.";

  // if/else reversed
  var template  = 'Such {{^ugly}}nice{{_else}}ugly{{/wow}}!';
  minstache(template, { ugly: false }); // => "Such nice!";

  // nested if/else!
  var template = 'Works? {{^works}}Nope.{{_else}}Yep, {{#awesome}}awesome{{_else}}cool{{/awesome}}!{{/works}}'
  minstache(template, { works: true, awesome: false }); // => "Works? Yep, cool!";
```

### Arrays

```js

  var template = '<ul>{{#contacts}}<li>{{name}}</li>{{/contacts}}</ul>';
  var list = { 
    contacts: [{ name: 'tobi' }, { name: 'loki' }, { name: 'jane' }] 
  };
  minstache(template, list); // => "<ul><li>tobi</li><li>loki</li><li>jane</li></ul>";

```

## Divergence

  Partials are not supported, this lib is meant to be a small template engine solution for stand-alone [component](http://github.com/component) templates. If your template takes "partials" then pass other rendered strings to it. If you need a full-blown mustache solution Hogan.js is still great.

  Minstache uses `{{!name}}` for unescaped properties.

## License

  MIT
