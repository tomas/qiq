
/**
 * Module dependencies.
 */

var mm = require('..');
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

    var opts = { delimiter: /\{\{ ?| ?\}\}/, skipCache: true };
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


  it('should support lambdas', function(){
    var obj = {
      md: function(str){
        return str.replace(/_(.*?)_/g, '<em>$1</em>');
      }
    };

    mm('{{#md}}some _markdown_ awesome!{{/md}}', obj)
      .should.equal('some <em>markdown</em> awesome!');
  })

  it('should iterate arrays', function(){
    var contacts = { contacts: [{ name: 'tobi' }, { name: 'loki' }, { name: 'jane' }] };
    mm('<ul>{{#contacts}}<li>{{name}}</li>{{/contacts}}</ul>', contacts)
     .should.equal('<ul><li>tobi</li><li>loki</li><li>jane</li></ul>');
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

  it('should ignore populated arrays', function(){
    var users = { users: [ 'tobi' ] };
    mm('users exist: {{#users}}yep{{/users}}{{^users}}nope{{/users}}', users)
     .should.equal('users exist: yep');
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

})
