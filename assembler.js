var Assembler = Class.create({
  initialize: function (syntax_tree) {
    this.tree = syntax_tree;
  },

  assemble: function () {
    var program_id = this.tree['identificationDiv']['program_id'];

    var source =
      'function ' + program_id + '() {\n' +
        this.variable().indent() + '\n\n' +
        this.program(this.tree['procedureDiv']['paragraph']).indent() + '\n' +
      '}\n' +
      program_id + '();';

    return source;
  },

  variable: function () {
    var source = [], i = 0;

    this.tree['dataDiv']['working_storage'].each(function (rec) {
      var parts = '';

      parts += 'var ' + rec['name'];

      if (rec['value']) {
        parts += ' = ' + rec['value'];
      }

      source[i++] = parts + ';';
    });

    return source.join('\n');
  },

  program: function (tree) {
    var source = [], i = 0;

    tree.each(function (sentence) {
      source[i++] = this.sentences(sentence['sentence']);
    }, this);

    return source.join('\n');
  },

  sentences: function (tree) {
    var source = [], i = 0;

    tree.each(function (statement) {
      var parts = '';

      switch (statement.name) {
        case 'display':
          parts += '$("output").value += '
                 + statement.values.join(' + ') + ' + "\\n"'
                 + ';';
          break;
        case 'accept':
          parts += statement.values + ' = prompt("");';
          break;
        case 'if':
          parts += 'if (' + statement.expr.join(' ') + ') {\n'
                 + this.sentences(statement.then).indent() + '\n'
                 + '}';
          break;
        case 'perform':
          switch (statement.loopType) {
            case 'times':
              parts += '$R(0, ' + statement.times + ', true).each(function(value) {\n';
              break;
            case 'until':
              parts += 'while (!(' + statement.until.join(' ') + ')) {\n';
              break;
            case 'varying':
              parts += statement.varying + ' = ' + statement.from + ';\n'
                     + 'while (!(' + statement.until.join(' ') + ')) {\n';
              break;
          }
          parts += this.sentences(statement.statements).indent() + '\n';
          switch (statement.loopType) {
            case 'times':
              parts += '}, this);';
              break;
            case 'until':
              parts += '}';
              break;
            case 'varying':
              parts += (statement.varying + ' += ' + statement.by + ';').indent() + '\n'
                     + '}';
              break;
          }
          break;
        case 'stop':
          parts += 'return;';
          break;
        case 'move':
          parts += statement.values[1] + ' = ' + statement.values[0] + ';';
          break;
        case 'add':
          parts += statement.values[0] + ' += ' + statement.values[1] + ';';
          break;
        case 'subtract':
          parts += statement.values[0] + ' -= ' + statement.values[1] + ';';
          break;
        case 'divide':
          parts += statement.values[0] + ' = Math.floor(' + statement.values[0] + ' / ' + statement.values[1] + ');';
          break;
        case 'multiply':
          parts += statement.values[0] + ' *= ' + statement.values[1] + ';';
          break;
      }

      source[i++] = parts;
    }, this);

    return source.join('\n');
  },
});

Object.extend(String.prototype, {
  indent: function (count) {
    count = count || 2;
    var indent = ' '.times(count);
    return indent + this.split('\n').join('\n' + indent);
  },

  rtrim: function () {
    return this.replace(/\s+$/, "");
  },
});