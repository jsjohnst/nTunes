var querystring = require("querystring");

function nSpecifier(specifier) {
  this.input = specifier;
  this._vars = [];
  this.chunks = specifier.split("/").splice(1);
  this._props = [];
  
  var currentVar;
  var currentObj = nClass.getClass("application");
  var i = 0;
  var isList = false;

  // TODO: This parsing logic is a fucking mess. I've been meaning
  // to rewite it (again) to be more robust. Specifically to fix this
  // special "/selection/count" case.
  while (i < this.chunks.length) {
    var prevChunk = this.chunks[i-1];
    var next = this.chunks[i++];
    if (this._props.length==1) {
      // If the parent chunk was a property, check if it's a class
      // instance, and if it is, set the variable of the previous
      // property request.
      var parentType = currentObj.getProperty(decodeURIComponent(prevChunk)).type;
      if (parentType == 'specifier') {
        isList = true;
        parentType = 'track';
      }
      var parentClass = nClass.getClass(decodeURIComponent(parentType));
      if (parentClass) {
        currentObj = parentClass;
        this.defineVar(decodeURIComponent(prevChunk));
        this._props = [];
      }
    }
    if (currentObj.hasElement(decodeURIComponent(next))) {
      // Ensure that
      this.defineVar('every ' + decodeURIComponent(next));
      currentObj = nClass.getClass(decodeURIComponent(next));
    } else {
      // Test for any custom handlers of 'currentObj'
      var handler = currentObj.getHandler(decodeURIComponent(next));
      if (handler) {
        this.handler = handler.callback;
      } else {
        // Test for a property(ies) request.
        // Property names are comma delimited.
        var isPropRequest = true;
        var props = next.split(',');
        for (var k=0, m=props.length; k<m; k++) {
          props[k] = decodeURIComponent(props[k]);
        }
        props.forEach(function(prop) {
          if (!currentObj.hasProperty(prop)) {
            isPropRequest = false;
          }
        });
        if (isPropRequest) {
          this._props = props;
        } else {
          // Test for a number.
          // Positive is index of parent list.
          // Negative is the id of the element of parent list.
          // Should throw an error if the specifier is not
          // currently parsing inside of a element.
          var numNext = Number(next);
          if (numNext == next) { // Loose comparison
            if (isList) {
              if (numNext > 0) {
                this.defineVar("item " + numNext);
              } else {
                // Throw an error, lists can only have index selectors
                // after them
              }
              isList = false;
            } else {
              this._vars.pop();
              this.defineVar(decodeURIComponent(prevChunk) + (numNext < 0 ? ' id':'') + ' ' + Math.abs(numNext));
            }
          } else if (next.indexOf('=') >= 0) {
            // Test for a query-string style filter. This
            // is only valid when the identifier before was
            // a containing element (same as when -Num for id is allowed).
            var filter = querystring.parse(next);
            var query = "";
            var keys = Object.keys(filter);
            keys.forEach(function(key, i) {
              query += key + ' is "' + decodeURIComponent(filter[key]) + '"';
              if (i < keys.length -1) {
                query += " and ";
              }
            });
            this._vars[this._vars.length-1].query = query;
            isList=true;
          } else {
            // Ummm.. invalid.. throw an Error?
            throw new Error("invalid specifier");
          }
        }
      }
    }
  }
  
}

nSpecifier.prototype.defineVar = function(prop) {
  var name = generateVariableName();
  this._vars.push({
    name: name,
    prop: prop
  });
}

Object.defineProperty(nSpecifier.prototype, 'vars', {
  get: function() {
    var vars = "";
    for (var i=0, l=this._vars.length-1; i<l; i++) {
      var v = this._vars[i];
      vars += 'set ' + v.name + ' to (' + v.prop +
        (i>0 ? ' of ' + this._vars[i-1].name : '') +
        (v.query ? ' whose ' + v.query : '') +
        ')\n';
    }
    return vars;
  }
});

Object.defineProperty(nSpecifier.prototype, 'properties', {
  get: function() {
    return this._props.length == 0
            ? ''
            : this._props.length == 1
              ? this._props[0]
              : '{'+this._props.join(',')+'}';
  }
});

Object.defineProperty(nSpecifier.prototype, 'finalVar', {
  get: function() {
    var finalVar = this._vars[this._vars.length-1];
    var props = this.properties;
    return props +
      (props && finalVar ? ' of ' : '') +
      (finalVar
        ?
        '(' + finalVar.prop +
          (this._vars.length>1 ? ' of ' + this._vars[this._vars.length-2].name : '') +
          (finalVar.query ? ' whose ' + finalVar.query : '') +
          ')'
        :
        ''
      );
  }
});

nSpecifier.setNClass = function(nclass) {
  nClass = nclass;
}

// Accepts an Applescript string like:
//   'file track id 263 of user playlist id 260 of source id 40 of application "iTunes"'
// and returns a usable Specifier string:
//   '/source/-40/user playlist/-260/file track/-263'
nSpecifier.specifierFromApplescript = function(applescript) {
  var rtn = "";
  applescript.split(" of ").reverse().forEach(function(piece, i) {
    if (i===0) return;
    piece = piece.split(" id ");
    rtn += '/' + piece[0] + '/-' + piece[1];
  });
  return rtn;
}

function generateVariableName() {
  return randomLetter() + randomLetter() + randomLetter() + randomLetter() +
         randomLetter() + randomLetter() + randomLetter() + randomLetter() +
         randomLetter() + randomLetter() + randomLetter() + randomLetter() +
         randomLetter() + randomLetter() + randomLetter() + randomLetter();
}

function randomLetter() {
  return String.fromCharCode(Math.floor(Math.random()*24)+97);
}

module.exports = nSpecifier;
