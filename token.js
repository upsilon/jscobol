var Token = Class.create({
  // Token クラスの定数は _initTokenFixed() 関数を参照

  src_str: null, // 元の文字
  str: null, // 整形済みの文字
  num: null, // DIGIT の場合は数値が入る
  type: null, // トークンの種類

  _upper: /[A-Z]/, // 大文字

  initialize: function(str, type) {
    this.src_str = str;
    this.str = str;

    if (type)
      this.type = type;
    else
      this.autoType();

    if (this.type == Token.DIGIT)
      this.num = parseInt(str);
    if (this.type == Token.QUOTE)
      this.str = this.src_str.substring(1, this.src_str.length - 1);
  },

  autoType: function () {
    for (var name in Token) {
      var t = Token[name];
      if (typeof(t) == 'string') {
        if (t == this.src_str) {
          this.type = t;
          return;
        }
      } else if (t instanceof RegExp) {
        if (t.test(this.src_str)) {
          this.type = t;
          return;
        }
      }
    }

    this.type = Token.ALNUM;
  },

  isEndOfStatement: function () {
    if (Token.ALNUM != this.type) {
      return false;
    }

    var str = this.str.toUpperCase();

    return Token.STATEMENT.include(str);
  },

  toString: function (debug) {
    debug = debug || false;

    if (debug) {
      var name = Token.typeToString(this.type);
      return this.str + " (TYPE: " + name + ")";
    }

    switch (this.type) {
      case Token.ALNUM:
        return this.str.sub('-', '$');
      case Token.QUOTE:
        return '"' + this.str + '"';
      case Token.OP_EQ:
        return '==';
      case Token.OP_NE:
        return '!=';
      default:
        break;
    }

    return this.str;
  },
});

Token.typeToString = function (type) {
  if (Object.isArray(type)) {
    var result = [];
    for (var i = 0; i < type.length; i++) {
      result[i] = Token.typeToString(type[i]);
    }

    return result;
  }

  for (var field in Token)
  {
    if (field.match(/^[A-Z_]+$/) && Token[field] == type)
    {
      return field;
    }
  }
};

// Tokenクラスの定数（もどき）を追加
(function () {
  var fixed = {
    DIGIT: /^-?\d+$/,         // -?[0-9]
    ALNUM: {},                // [a-zA-Z][0-9a-zA-Z]+
    QUOTE: /^\".*\"$/,        // 文字列
    OP_NOT: "!",              // !
    OP_SHARP: "#",            // #
    OP_DOLLAR: "$",           // $
    OP_MOD: "%",              // %
    OP_AND: "&",              // &
    OP_SQUOTE: "'",           // '
    OP_SMALL_LEFT: "(",       // (
    OP_SMALL_RIGHT: ")",      // )
    OP_MULTI: "*",            // *
    OP_PLUS: "+",             // +
    OP_COMMA: ",",            // ,
    OP_MINUS: "-",            // -
    OP_PERIOD: ".",           // .
    OP_DIVIDE: "/",           // /
    OP_COLON: ":",            // :
    OP_SEMICOLON: ";",        // ;
    OP_GE: "<=",              // <=
    OP_GT: "<",               // <
    OP_LE: ">=",              // >=
    OP_LT: ">",               // >
    OP_EQ: "=",               // =
    OP_QUESTION: "?",         // ?
    OP_AT: "@",               // @
    OP_LARGE_OPEN: "[",       // [
    OP_BS: "\\",              // \
    OP_LARGE_CLOSE: "]",      // ]
    OP_HAT: "^",              // ^
    OP_UNDERSCORE: "_",       // _
    OP_BACKQUOTE: "`",        // `
    OP_MEDIUM_OPEN: "{",      // {
    OP_VERTICAL: "|",         // |
    OP_MEDIUM_CLOSE: "}",     // }
    OP_TILDE: "~",            // ~

    STATEMENT: [              // 文の先頭となる句
      'ACCEPT', 'ADD', 'ALTER',
      'CALL', 'CANCEL', 'CLOSE', 'COMPUTE', 'CONTINUE',
      'DELETE', 'DISPLAY', 'DIVIDE',
      'END-ADD', 'END-CALL', 'END-COMPUTE', 'END-DELETE', 'END-DIVIDE', 'END-EVALUATE',
      'END-IF', 'END-MULTIPLY', 'END-OF-PAGE', 'END-PERFORM', 'END-READ', 'END-RECEIVE',
      'END-RETURN', 'END-REWRITE', 'END-SEARCH', 'END-START', 'END-STRING', 'END-SUBTRACT',
      'END-UNSTRING', 'END-WRITE', 'ENTRY', 'EVALUATE', 'EXIT',
      'GOBACK', 'GO',
      'IF', 'INITIALIZE', 'INSPECT', 'INVOKE',
      'MERGE', 'MOVE', 'MULTIPLY',
      'OPEN',
      'PERFORM',
      'READ', 'RELEASE', 'RETURN', 'REWRITE',
      'SEARCH', 'SET', 'SORT', 'START', 'STOP', 'STRING', 'SUBTRACT',
      'UNSTRING', 'WRITE',
    ],
  };

  for (var key in fixed) {
    Token[key] = fixed[key];
  }
}());
