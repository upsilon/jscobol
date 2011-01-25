var Parser = Class.create({
  lexer: null,

  initialize: function (lexer) {
    this.lexer = lexer;
  },

  parse: function () {
    return {
      identificationDiv:  this.identificationDiv(),
      environmentDiv:     this.environmentDiv(),
      dataDiv:            this.dataDiv(),
      procedureDiv:       this.procedureDiv(),
    };
  },

  identificationDiv: function () {
    this.assertDivision('IDENTIFICATION');

    return {
      program_id: this.programId(),
    };
  },

  programId: function () {
    var idToken;

    assertToken(this.lexer.next(), {
      str: 'PROGRAM-ID',
      error: 'PROGRAM-ID がありません',
    });

    assertToken(this.lexer.next(), {
      type: Token.OP_PERIOD,
      error: 'PROGRAM-ID の後にピリオドがありません',
    });

    idToken = this.lexer.next();
    assertToken(idToken, {
      type: Token.ALNUM,
      error: 'PROGRAM-ID がありません',
    });

    assertToken(this.lexer.next(), {
      type: Token.OP_PERIOD,
      error: 'PROGRAM-ID の最後にピリオドがありません',
    });

    return idToken;
  },

  environmentDiv: function () {
    this.assertDivision('ENVIRONMENT');

    return {};
  },

  dataDiv: function () {
    this.assertDivision('DATA');

    var result = {};

    DIVISION:
    for (;;) {
      var t = this.lexer.next();

      switch (t.str) {
        case 'WORKING-STORAGE':
          result['working_storage'] = this.workingStorageSec();
          break;
        default:
          this.lexer.previous();
          break DIVISION;
      }
    }

    return result;
  },

  workingStorageSec: function () {
    assertToken(this.lexer.next(), {str: 'SECTION'});
    assertToken(this.lexer.next(), {type: Token.OP_PERIOD});

    return record = this.entries(this.dataDescriptionEntry, this);
  },

  dataDescriptionEntry: function () {
    var result = {};
    var t = this.lexer.next();

    if (t.type != Token.DIGIT) {
      this.lexer.previous();
      return null;
    }

    result['name'] = null;

    t = this.lexer.next();

    while (t.type != Token.OP_PERIOD) {
      assertToken(t, {type: Token.ALNUM});

      switch (t.str) {
        case 'PICTURE':
        case 'PIC':
          result['format'] = this.pictureClause();
          break;
        case 'VALUE':
          result['value'] = this.valueClause();
          break;
        default:
          if (result['name'] != null) {
            throw new ParserError("不正なトークン (ピリオド不足/過剰?): " + t);
          }
          result['name'] = t;
      }

      t = this.lexer.next();
    }

    return result;
  },

  pictureClause: function() {
    var format = '', prevFmt = null;

    t = this.lexer.next();

    PICTURE:
    while ([Token.ALNUM, Token.DIGIT, Token.OP_COMMA, Token.OP_SMALL_LEFT].include(t.type)) {
      if (t.type == Token.OP_SMALL_LEFT) {
        if (prevFmt == null) {
          throw new ParserError("書式が不正です");
        }

        t = this.lexer.next();
        assertToken(t, {type: Token.DIGIT});

        format += prevFmt.times(t.num);

        t = this.lexer.next();
        assertToken(t, {type: Token.OP_SMALL_RIGHT});

        prevFmt = null;
      } else {
        var str = '';
        for (var i = 0; i < t.str.length; i++) {
          var c = t.str.charAt(i);
          if (!['9', 'X', 'Z', ','].include(c)) {
            break PICTURE;
          }
          str += c;
          prevFmt = c;
        }

        format += str;
      }

      t = this.lexer.next();
    }

    t = this.lexer.previous();

    return format;
  },

  valueClause: function () {
    t = this.lexer.next();
    assertToken(t, {type: [Token.DIGIT, Token.ALNUM, Token.QUOTE]});
    return t;
  },

  procedureDiv: function () {
    this.assertDivision('PROCEDURE');

    return {
      paragraph: this.entries(this.paragraph, this),
    };
  },

  paragraph: function () {
    var s = this.sentence();

    if (null == s) {
      return null;
    }

    assertToken(this.lexer.next(), {type: Token.OP_PERIOD});

    return {
      sentence: s,
    };
  },

  sentence: function () {
    var s = this.entries(this.statement, this);

    if (0 == s.length)
      return null;

    return s;
  },

  statement: function () {
    var t = this.lexer.next();

    if (null == t || Token.OP_PERIOD == t.type) {
      this.lexer.previous();
      return null;
    }

    assertToken(t, {type: Token.ALNUM});

    switch (t.str) {
      case 'ACCEPT':
        return this.acceptStatement();
      case 'DISPLAY':
        return this.displayStatement();
      case 'IF':
        return this.ifStatement();
      case 'STOP':
        return this.stopStatement();
      case 'PERFORM':
        return this.performStatement();
      case 'MOVE':
        return this.moveStatement();
      case 'ADD':
      case 'SUBTRACT':
      case 'DIVIDE':
      case 'MULTIPLY':
        return this.computeStatement(t.str.toLowerCase());
    }

    this.lexer.previous();

    return null;
  },

  acceptStatement: function () {
    t = this.lexer.next();
    assertToken(t, {type: Token.ALNUM});

    return new Statement('accept', t);
  },

  displayStatement: function () {
    var a = [];

    t = this.lexer.next();

    if (t.isEndOfStatement() || t.type == Token.OP_PERIOD) {
      throw new ParserError('DISPLAY の後に何も値がありません');
    }

    do {
      assertToken(t, {type: [Token.ALNUM, Token.DIGIT, Token.QUOTE]});
      a[a.length] = t;

      t = this.lexer.next();
    }
    while (!(t.isEndOfStatement() || t.type == Token.OP_PERIOD));

    this.lexer.previous();

    return new Statement('display', a);
  },

  ifStatement: function () {
    var expr = this.conjunction();

    assertToken(this.lexer.next(), {str: 'THEN', error: 'THEN がありません'});

    var sentence = this.sentence();

    assertToken(this.lexer.next(), {str: 'END-IF', error: 'END-IF がありません'});

    return new StatementIf(expr, sentence, null);
  },

  performStatement: function () {
    var loop;
    var token = this.lexer.next();

    assertToken(token, [Token.ALNUM, Token.DIGIT]);

    if (token.type == Token.DIGIT) {
      var times = token.num;
      assertToken(this.lexer.next(), {str: 'TIMES', error: 'TIMES がありません'});

      loop = {
        loopType: 'times', 
        times: num,
      };
    } else if (token.str == 'UNTIL') {
      var until = this.conjunction();
      loop = {
        loopType: 'until',
        until: until,
      };
    } else if (token.str == 'VARYING') {
      var varying = this.lexer.next();
      assertToken(varying, Token.ALNUM);

      assertToken(this.lexer.next(), {str: 'FROM', error: 'FROM がありません'});
      var from = this.lexer.next();
      assertToken(varying, Token.DIGIT);

      assertToken(this.lexer.next(), {str: 'BY', error: 'BY がありません'});
      var by = this.lexer.next();
      assertToken(varying, Token.DIGIT);

      assertToken(this.lexer.next(), {str: 'UNTIL', error: 'UNTIL がありません'});
      var until = this.conjunction();
      loop = {
        loopType: 'varying',
        varying: varying,
        from: from,
        by: by,
        until: until,
      };
    }

    var sentence = this.sentence();

    assertToken(this.lexer.next(), {str: 'END-PERFORM', error: 'END-PERFORM がありません'});

    return new StatementPerform(loop, sentence, null);
  },

  stopStatement: function () {
    assertToken(this.lexer.next(), {str: 'RUN'});

    return new Statement('stop', 'run');
  },

  computeStatement: function (str) {
    var v1 = this.lexer.next();
    assertToken(v1, {type: Token.ALNUM});

    assertToken(this.lexer.next(), {str: 'BY'});

    var v2 = this.lexer.next();
    assertToken(v2, {type: [Token.ALNUM, Token.DIGIT, Token.QUOTE]});

    return new Statement(str, [v1, v2]);
  },

  moveStatement: function () {
    var v1 = this.lexer.next();
    assertToken(v1, {type: [Token.ALNUM, Token.DIGIT, Token.QUOTE]});

    assertToken(this.lexer.next(), {str: 'TO'});

    var v2 = this.lexer.next();
    assertToken(v2, {type: Token.ALNUM});

    return new Statement('move', [v1, v2]);
  },

  conjunction: function () {
    var result = this.condition();

    var t = this.lexer.next();
    if (['AND', 'OR'].include(t.str)) {
      return [result, t, this.conjunction()];
    }

    this.lexer.previous();

    return result;
  },

  condition: function () {
    var result = this.expression();

    var t = this.lexer.next();
    if ([Token.OP_EQ, Token.OP_LE, Token.OP_LT, Token.OP_GE, Token.OP_GT].include(t.type)) {
      return [result, t, this.condition()];
    }

    this.lexer.previous();

    return result;
  },

  expression: function () {
    var result = this.term();

    var t = this.lexer.next();
    if ([Token.OP_PLUS, Token.OP_MINUS].include(t.type)) {
      return [result, t, this.expression()];
    }

    this.lexer.previous();

    return result;
  },

  term: function () {
    var result = this.factor();

    var t = this.lexer.next();
    if ([Token.OP_MULTI, Token.OP_DIVIDE].include(t.type)) {
      return [result, t, this.term()];
    }

    this.lexer.previous();

    return result;
  },

  factor: function () {
    var t = this.lexer.next();
    if (Token.OP_SMALL_LEFT == t.type) {
      var result = this.expr();
      assertToken(this.lexer.next(), {type: Token.OP_SMALL_RIGHT});

      return result;
    }
    else if ([Token.OP_PLUS, Token.OP_MINUS].include(t.type)) {
      return this.factor();
    }
    else if (Token.ALNUM == t.type) {
      var result = [t];

      t = this.lexer.next();
      if (Token.OP_SMALL_LEFT == t.type) {
        do {
          var expression = this.expression();
          result[result.length] = expression;

          t = this.lexer.next();
        }
        while(Token.OP_SMALL_RIGHT != t.type);

        return result;
      }
      else {
        t = this.lexer.previous();
      }
    }

    assertToken(t, {type: [Token.ALNUM, Token.DIGIT]});

    return t;
  },

  entries: function (func, self) {
    func = func.bind(self);

    var a = [], b;
    while (null != (b = func())) {
      a[a.length] = b;
    }

    return a;
  },

  assertDivision: function (divName) {
    try {
      assertToken(this.lexer.next(), {
        str: divName,
      });
      assertToken(this.lexer.next(), {
        str: 'DIVISION',
      });
    }
    catch (e) {
      throw new ParserError(divName + ' DIVISION. がありません', e);
    }

    assertToken(this.lexer.next(), {
      type: Token.OP_PERIOD,
      error: divName + ' DIVISION の後にピリオドがありません',
    });
  },
});

function assert(bool) {
  if (!bool) {
    throw new Error('assertion error!');
  }
}

function assertToken(token, args) {
  args['type'] = args['type'] || Token.ALNUM;

  if (args['type'] && !Object.isArray(args['type'])) {
    args['type'] = [ args['type'] ];
  }

  if (args['str'] && !Object.isArray(args['str'])) {
    args['str'] = [ args['str'] ];
  }

  try {
    if (null == token) {
      throw new UnexpectedEofError('プログラムが途中で終了しています');
    }

    if (args['type'] && !args['type'].include(token.type)) {
      if (args['str']) {
        throw new ParserError('token: ' + token + ', 期待値: \"' + args['str'] + '\" (TYPE: ' + Token.typeToString(args['type']) + ')');
      } else {
        throw new ParserError('token: ' + token + ', 期待値: ' + Token.typeToString(args['type']));
      }
    }

    if (args['str'] && !args['str'].include(token.str)) {
      throw new ParserError('token: ' + token + ', 期待値: \"' + args['str'] + '\"');
    }
  }
  catch (e) {
    if (!args['error']) {
      throw e;
    }

    throw new ParserError(args['error'], e);
  }
}

var ParserError = function (message, error) {
  this.name = 'ParserError';
  this.message = message;

  if (error) {
    this.message += '\n (' + error.message + ')';
  }
};
ParserError.prototype = Error.prototype;

var UnexpectedEofError = function (message, error) {
  this.name = 'UnexpectedEof';
  this.message = message;

  if (error) {
    this.message += '\n (' + error.message + ')';
  }
};
UnexpectedEofError.prototype = ParserError.prototype;

