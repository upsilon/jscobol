var Statement = Class.create({
  name: null,
  values: null,

  initialize: function (name, values) {
    this.name = name;
    this.values = values;
  },

  addValues: function (hash) {
    for (var key in hash) {
      this[key] = hash[key];
    }
  }
});

var StatementIf = Class.create(Statement, {
  expr: null,
  then: null,
  'else': null,

  initialize: function (expr, then, _else) {
    this.name = 'if';

    this.expr = expr;
    this.then = then;
    this['else'] = _else;
  },
});

var StatementPerform = Class.create(Statement, {
  initialize: function (loop, statements) {
    this.name = 'perform';
    this.addValues(loop);
    this.statements = statements;
  },
});

var Condition = Class.create({
  initialize: function (tree) {
    this.tree = tree;
    this.str = null;
  },

  toString: function () {
    if (this.str != null) {
      return this.str;
    }

    
  },
});
