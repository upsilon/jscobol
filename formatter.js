/**
 * Json.Formatter
 * http://dara-j.asablo.jp/blog/2007/05/15/1509590 よりコピー・改変
 *
 * License: NYSL version 0.9982 (http://www.kmonos.net/nysl/)
 */

// 文字列を引用符で囲う
String.prototype.quote = function() {
	var s = this;
	var a = [
		{ match : /\\/g, replace : "\\\\" },
		{ match : /\f/g, replace : "\\f" },
		{ match : /\n/g, replace : "\\n" },
		{ match : /\r/g, replace : "\\r" },
		{ match : /\t/g, replace : "\\t" },
		{ match : /\v/g, replace : "\\v" },
		{ match : /"/g, replace : "\\\"" }
	];
	for(var i = 0; i < a.length; i++) {
		var value = a[i];
		s = s.replace( value.match, value.replace );
	};
	return [ "\"", s, "\"" ].join("");
}

if( typeof( Json ) == "undefined" ) {
	var Json = {
	}
}

Json.Formatter = function() {
	this.initialize.apply( this, arguments );
}
Json.Formatter.prototype = {
	value : false,
	
	// 初期化処理
	initialize : function(obj) {
		var indent_char = Json.Formatter.indentString || "\t";
		var name = arguments[1] ? arguments[1].toString().quote() : null;
		var indent = isNaN( arguments[2] ) ? 0 : Number( arguments[2] );
		
		var current_indent = Json.Formatter.createString( indent_char, indent );
		var buffer = [ current_indent ];
		
		if( name ) {
			buffer.push( name );
			buffer.push( " : " );
		}
		
		var type = typeof( obj );
		if( type == "undefined" ) {
			// undefined
			// なにもしない
			
		} else if( obj == null ) {
			// null
			// プロパティの値の場合のみ'null'を追加
			if( name ) buffer.push( "null" );
			
		} else if( type == "string" ) {
			// string
			buffer.push( obj.quote() );
			
		} else if( type == "number" ) {
			// number
			buffer.push( obj.toString() );
			
		} else if( type == "boolean" ) {
			// boolean
			buffer.push( ( !! obj ).toString() );
			
		} else if( obj instanceof Array ) {
			// array
			var hasProp = obj.length > 0;
			var lastIndex = obj.length - 1;
			
			buffer.push( "[" );
			buffer.push( hasProp ? "\r\n" : "" );
			// 要素を再帰処理
			for(var index = 0; index < obj.length; index++) {
				var v = obj[ index ];
				if( v != null ) {
					buffer.push( new Json.Formatter( v, null, indent + 1 ).value );
					buffer.push( index < lastIndex ? "," : "" );
					buffer.push( "\r\n" );
				}
			}
			if( buffer.length > 2 && buffer[ buffer.length - 2 ] == "," ) buffer[ buffer.length - 2 ] = "";
			buffer.push( hasProp ? current_indent : "" );
			buffer.push( "]" );
			
		} else if( obj instanceof Token ) {
			// Token
			buffer.push( "'" );
			buffer.push( obj.toString(true) );
			buffer.push( "'" );
		} else {
			// object
			var hasProp = false;
			for(var key in obj) {
				if( typeof(obj) != "function" ) {
					hasProp = true;
					break;
				}
			}
			
			buffer.push( "{" );
			buffer.push( hasProp ? "\r\n" : "" );
			// プロパティを再帰処理
			for(key in obj) {
				if( typeof(obj[key]) == "function" ) continue;
				buffer.push( new Json.Formatter( obj[key], key, indent + 1 ).value );
				buffer.push( ",\r\n" );
			}
			if( hasProp ) buffer.length--;
			
			buffer.push( hasProp ? "\r\n" : "" );
			buffer.push( hasProp ? current_indent : "" );
			buffer.push( "}" );
			
		}
		
		// valueプロパティ確定
		this.value = buffer.join("");
		
		var self = this;
		this.toString = function() {
			return self.value;
		}
	}
}
Json.Formatter.createString = function(c, l) {
	var result = new Array( l );
	for(var i = 0; i < l; i++) result[ i ] = c;
	return result.join("");
}
Json.Formatter.indentString = "  ";
