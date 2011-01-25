var PushbackableEnumerator = Class.create(Enumerable, {
  initialize: function () {
    this.reset();
  },

  reset: function () {
    this.hist = [];
    this.ptr = 0;
  },

  each: function (iterator) {
    this.reset();

    var token;
    while (null != (token = this.next())) {
      iterator(token);
    }
  },

  next: function () {
    if (this.hist.length != this.ptr) {
      return this.hist[this.ptr++];
    }

    var t = this._next();

    if (Object.isArray(t))
      this.hist = this.hist.concat(t);
    else
      this.hist.push(t);

    return this.hist[this.ptr++];
  },

  previous: function () {
    if (0 == this.ptr) {
      throw new Error("Stack underflow!");
    }

    this.ptr--;

    return this.ptr != 0 ? this.hist[this.ptr - 1] : null;
  },
});

var Lexer = Class.create(PushbackableEnumerator, {
  regs: {
    DIGIT: /[0-9]/,
    ALPHA: /[a-z]/i,
    ALNUM: /[0-9a-z\-]/i,
  },

  initialize: function (text) {
    this.text = text;
    this.reset();
  },

  reset: function () {
    PushbackableEnumerator.prototype.reset.apply(this);

    this.read_p = 0;
  },

  isEof: function () {
    return this.text.length <= this.read_p;
  },

  createToken: function (str) {
    return new Token(str);
  },

  _next: function () {
    var str = '';
    var isPartOfSeparator = false, isPartOfQuote = false, isPartOfPeriod = false;

    while (!this.isEof()) {
      var c = this.text.charAt(this.read_p++);

      if (isPartOfQuote) {
        str += c;

        if (c == '"')
          return this.createToken(str);
        else
          continue;
      }

      if (isPartOfSeparator && !c.blank())
        isPartOfSeparator = false;

      if (isPartOfPeriod && !c.blank())
        isPartOfPeriod = false;

      if (c.blank()) {
        if (isPartOfPeriod) {
          str = str.substring(0, str.length - 1);

          if (str.blank())
            return this.createToken('.');
          else
            return [str, '.'].collect(this.createToken);
        }

        if (isPartOfSeparator) {
          str = str.substring(0, str.length - 1);
          isPartOfSeparator = false;
        }

        if (str.blank())
          continue;

        return this.createToken(str);
      }

      if ([',', ';', '.'].include(c))
        isPartOfSeparator = true;

      if (c == '.')
        isPartOfPeriod = true;

      if (['(', ')', ':'].include(c)) {
        if (str.blank())
          return this.createToken(c);
        else
          return [str, c].collect(this.createToken);
      }

      if (c == '"')
        isPartOfQuote = true;

      str += c;
    }
  },
});
