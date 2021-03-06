
/**
 * Module dependencies.
 */

// var mm = require('..');
var mm = require('../dist/qiq.min');
var should = require('should');

describe('{id}', function(){
  it('should not work', function(){
    var user = { name: 'tobi' };
    mm('hi {name}.', user).should.equal('hi {name}.');
  })
})

describe('{{id}}', function(){
  it('should buffer', function(){
    var user = { name: 'tobi' };
    mm('hi {{name}}.', user).should.equal('hi tobi.');
  })

  it('should escape', function(){
    var user = { name: '<script>' };
    mm('hi {{name}}.', user).should.equal('hi &lt;script&gt;.');
  })

  it('allows spaces in tags', function(){
    var user = { name: 'test' };
    mm('hi {{ name }}.', user).should.equal('hi test.');
  })

  it('should support nested props', function(){
    var user = { name: { first: 'tobi', last: 'ferret' }};
    mm('hi {{name.first}} {{name.last}}.', user).should.equal('hi tobi ferret.');
  })

  it('should support bracket props', function(){
    var user = { name: { first: 'tobi', 1: 'ferret' }};
    mm('hi {{name["first"]}} {{name[1]}}.', user).should.equal('hi tobi ferret.');
  })

  it('should escape newlines', function(){
    var user = { name: 'tobi' };
    mm('hi,\nhow are you {{name}}?', user).should.equal('hi,\nhow are you tobi?');
  })

  it('should escape quotes', function(){
    mm('"hey"').should.equal('"hey"');
  })

  it('should allow setting a different delimiter', function(){
    var opts = { delimiter: /\[\[ ?| ?\]\]/ };
    var data = { foo: '123', var: 234 }
    mm('{{foo}} [[var]]', data, opts).should.equal('{{foo}} 234');

    var opts = { delimiter: /\{\{ ?| ?\}\}/ };
    mm('{{foo}} [[var]]', data, opts).should.equal('123 [[var]]');
  })

  it('should only match words', function(done){
    try {
      mm('hi {{name)}}.');
    } catch (err) {
      err.message.should.equal('invalid property "name)"');
      done();
    }
  })
})

describe('{{!id}}', function(){
  it('should be unescaped', function(){
    var user = { name: '<script>' };
    mm('hi {{!name}}.', user).should.equal('hi <script>.');
  })
})

describe('{{#id}}', function(){
  it('should pass through when truthy', function(){
    var user = { admin: true };
    mm('{{#admin}}yup{{/admin}}', user).should.equal('yup');
  })

  it('should ignore when falsey', function(){
    var user = { admin: false };
    mm('admin: {{#admin}}yup{{/admin}}', user).should.equal('admin: ');
  })

  it('should ignore when undefined', function(){
    var user = {};
    mm('admin: {{#admin}}yup{{/admin}}', user).should.equal('admin: ');
  })

  it('should support nested tags', function(){
    var user = { admin: true, name: 'tobi' };
    mm('{{#admin}}{{name}} is an admin{{/admin}}', user).should.equal('tobi is an admin');
  })

  it('should support nested conditionals', function(){
    var user = { admin: true, authenticated: true };
    mm('{{#admin}}{{#authenticated}}yup{{/}}{{/}}', user).should.equal('yup');
  })

  it('should work with regular HTML', function(){
    var user = { admin: true, authenticated: true };
    mm('<div class="login">\n{{#authenticated}}\nlogged in!\n{{/}}\n</div>', user).should.equal('<div class="login">\n\nlogged in!\n\n</div>');
  })

  it('should support functions that return booleans', function(){
    var obj = {
      bool: function(block) {
        return true
      },
      test: function(block) {
        return block == 'yes';
      }
    };

    mm('{{#bool}}yes{{/bool}}', obj)
      .should.equal('yes');

    mm('{{bool?}}yes{{/bool?}}', obj)
      .should.equal('yes');

    mm('{{#bool}}yes{{_else}}no{{/}}', obj)
      .should.equal('yes');

    mm('{{bool?}}yes{{_else}}no{{/}}', obj)
      .should.equal('yes');

    mm('{{nope?}}yes{{_else}}no{{/}}', obj)
      .should.equal('no');

    mm('{{^bool}}yes{{_else}}no{{/}}', obj)
      .should.equal('no');

    mm('{{#test}}yes{{_test}}no{{/test}}', obj)
      .should.equal('yes');

    mm('{{^test}}yes{{_test}}no{{/}}', obj)
      .should.equal('no');

    mm('{{^test}}yes{{_else}}no{{/test}}', obj)
      .should.equal('no');

  })

  it('should support functions that return strings', function(){
    var obj = {
      md: function(str, i) {
        return str.replace(/_(.*?)_/g, '<em>$1</em>');
      }
    };

    mm('{{#md}}some _markdown_ awesome!{{/md}}', obj)
      .should.equal('some <em>markdown</em> awesome!');
  })

  it('should iterate arrays of objects', function(){
    var contacts = { contacts: [{ name: 'tobi' }, { name: 'loki' }, { name: 'jane' }] };
    mm('<ul>{{#contacts}}<li>{{name}}</li>{{_}}bar{{/contacts}}</ul>', contacts)
     .should.equal('<ul><li>tobi</li><li>loki</li><li>jane</li></ul>');
  })

  it('should iterate arrays of elements', function(){
    var contacts = { numbers: ['one', 'two', 'three'] };
    mm('<ul>{{#numbers}}<li>{{this}}</li>{{_else}}foo{{/}}</ul>', contacts)
     .should.equal('<ul><li>one</li><li>two</li><li>three</li></ul>');
  })

  it('should not iterate nonexisting arrays', function(){
    var contacts = { numbers: ['one', 'two', 'three'] };
    mm('<ul>{{^numbers}}<li>{{this}}</li>{{_else}}<li>no results</li>{{/}}</ul>', contacts)
     .should.equal('<ul><li>no results</li></ul>');
  })

  it('should not descend into arrays if using question mark', function(){
    var contacts = { title: 'guys', contacts: [{ name: 'tobi' }, { name: 'loki' }, { name: 'jane' }] };
    mm('<h2>{{ contacts? }}{{ contacts.length }} {{ title }}{{ /contacts? }}</h2>', contacts)
     .should.equal('<h2>3 guys</h2>');
  })

  it('should not descend into arrays if using question mark and not found', function(){
    var contacts = { title: 'guys', contacts: [{ name: 'tobi' }, { name: 'loki' }, { name: 'jane' }] };
    mm('<h2>{{ others? }}{{ contacts.length }} {{ _ }}no {{ title }}{{ /others? }}</h2>', contacts)
     .should.equal('<h2>no guys</h2>');
  })


  it('should descend into objects if requested and present', function(){
    var data = { color: { r: '1', g: '2', b: 3 } };
    mm('{{#color}}{{r}}-{{g}}-{{b}}{{_}}foobar{{/color}}', data).should.equal('1-2-3');
  })

  it('should not descend into objects if not present', function(){
    var data = { title: 'hello' };
    mm('{{#color}}{{title}}{{_else}}{{title}}{{/color}}', data).should.equal('hello');
  })

  it('should not descend into objects if not present, reversed', function(){
    var data = { title: 'hello' };
    mm('{{^color}}{{title}}{{_else}}nope{{/color}}', data).should.equal('hello');
  })

  it('should not descend into objects if present, reversed', function(){
    var data = { title: 'looks like its there', color: { foo: 'bar' } };
    mm('{{^color}}does not exist{{_else}}{{title}}{{/color}}', data).should.equal('looks like its there');
  })

  it('should not descend into objects if question mark', function(){
    var data = { color: { r: '1', g: '2', b: 3 } };
    mm('{{color?}}{{color.r}}-{{color.g}}-{{color.b}}{{_else}}hello{{/color?}}', data).should.equal('1-2-3');
  })

  it('should not descend into objects if question mark, and not present', function(){
    var data = { color: { r: '1', g: '2', b: 3 } };
    mm('{{missing?}}missing{{_else}}{{color.r}}-{{color.g}}-{{color.b}}{{/missing?}}', data).should.equal('1-2-3');
  })

})

describe('{{^id}}', function(){

  it('should ignore when truthy', function(){
    var user = { admin: true };
    mm('{{^admin}}yup{{/admin}}', user).should.equal('');
  })

  it('should pass through when falsey', function(){
    var user = { admin: false };
    mm('admin: {{^admin}}nope{{/admin}}', user).should.equal('admin: nope');
  })

  it('should support nested tags', function(){
    var user = { admin: false, name: 'tobi' };
    mm('{{^admin}}{{name}} is not an admin{{/admin}}', user).should.equal('tobi is not an admin');
  })

  it('should support nested conditionals', function(){
    var user = { admin: false, authenticated: false };
    mm('{{^admin}}{{^authenticated}}nope{{/}}{{/}}', user).should.equal('nope');
  })

  it('should consider empty arrays falsy', function(){
    var users = { users: [] };
    mm('users exist: {{^users}}nope{{/users}}', users)
     .should.equal('users exist: nope');
  })

  it('should process populated arrays', function(){
    var users = { users: [ 'tobi' ] };
    mm('users exist: {{#users}}yep, {{this}}{{/users}}{{^users}}nope{{/users}}', users)
     .should.equal('users exist: yep, tobi');
  })

  it('should include indexes', function(){
    var users = { users: [ 'tom', 'mot' ] };
    mm('users:{{#users}} {{i}} -> {{this}}{{/users}}', users)
     .should.equal('users: 0 -> tom 1 -> mot');
  })

  it('should honor ifelse', function(){
    var data = { fails: false };
    mm('fails? {{#fails}}yep{{_fails}}nope{{/fails}}', data)
     .should.equal('fails? nope');
  })

  it('should honor ifelse with "else" keyword too', function(){
    var data = { fails: false };
    mm('fails? {{#fails}}yep{{_else}}nope{{/fails}}', data)
     .should.equal('fails? nope');
  })

  it('should honor ifelse (inverted)', function(){
    var data = { works: true };
    mm('fails? {{^works}}yep{{_works}}nope{{/works}}', data)
     .should.equal('fails? nope');
  })

  it('ifelse works with single char', function(){
    var data = { works: true };
    mm('fails? {{^works}}yep{{_}}nope{{/}}', data)
     .should.equal('fails? nope');
  })

  it('should supported nested ifelses', function(){
    var data = { fails: false, hot: false };
    mm('fails? {{#fails}}yep{{_fails}}nope, {{#hot}}not cool{{_hot}}cool!{{/hot}}{{/fails}}', data)
     .should.equal('fails? nope, cool!');
  })

  it('should supported nested ifelses', function(){
    var data = { fails: false, hot: true };
    mm('fails? {{#fails}}yep{{_fails}}nope, {{^hot}}not cool{{_hot}}cool!{{/hot}}{{/fails}}', data)
     .should.equal('fails? nope, cool!');
  })

  it('can do nested question mark and then descend block', function(){
    var data = { products: [ { name: 'one' }, { name: 'two' } ] };
    mm('{{products?}}Products: {{products.length}} --> {{#products}}{{name}} {{/products}}{{/products?}}', data)
     .should.equal('Products: 2 --> one two ');
  })

})

describe('deep objects', function() {

  var obj =  { nested: { prop: true, val: 'hello', arr: [1,2,3] } };

  it('allows outputting values', function() {
    mm('{{nested.val}}', obj).should.equal('hello');
  })

  it('does not descend directly into arrays', function() {
    mm('{{#nested.arr}}number: {{this}} {{_else}}foo{{/}}', obj).should.equal('foo');
  })

  it('descends into arrays, if context matches', function() {
    mm('{{#nested}}{{#arr}}number: {{this}} {{_else}}foo{{/}}{{/}}', obj).should.equal('number: 1 number: 2 number: 3 ');
  })

  it('does not allow question mark directly, if question mark', function() {
    mm('{{nested.prop?}}awesome{{_else}}not so awesome{{/}}', obj).should.equal('not so awesome');
  })

  it('does not allow question mark directly, with mark', function() {
    mm('{{#nested.prop}}awesome{{_else}}not so awesome{{/}}', obj).should.equal('not so awesome');
  })

  it('allows question mark, only if in context', function() {
    mm('{{nested?}}{{#nested}}{{prop?}}awesome{{_else}}not so awesome{{/prop?}}{{/nested}}{{/nested?}}', obj).should.equal('awesome');
  })

})