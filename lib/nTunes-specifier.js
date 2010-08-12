var querystring = require("querystring");

function nSpecifier(specifier) {
  this._vars = [];
  this.chunks = specifier.split("/").splice(1);
  this._props = [];
  
  var currentVar;
  var currentObj = nClass.getClass("application");
  var i = 0;
  var isList = false;

  while (i < this.chunks.length) {
    var prevChunk = this.chunks[i-1];
    var next = this.chunks[i++];
    if (this._props.length==1) {
      // If the parent chunk was a property, check if it's a class
      // instance, and if it is, set the variable of the previous
      // property request.
      var parentClass = nClass.getClass(currentObj.getProperty(prevChunk).type);
      if (parentClass) {
        currentObj = parentClass;
        this.defineVar(prevChunk);
        this._props = [];
      }
    }
    if (currentObj.hasElement(next)) {
      // Ensure that
      this.defineVar('every ' + next);
      currentObj = nClass.getClass(next);
    } else {
      // Test for a property(ies) request.
      // Property names are comma delimited.
      var isPropRequest = true;
      var props = next.split(',');
      props.forEach(function(prop) {
        if (!currentObj.hasProperty(prop)) {
          isPropRequest = false;
        }
      });
      if (isPropRequest) {
        this._props = props;
      } else {
        // Test for a number.
        // Positive is index of parent element.
        // Negative is the id of the element of parent element.
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
            this.defineVar(prevChunk + (numNext < 0 ? ' id':'') + ' ' + Math.abs(numNext));
          }
        } else {
          // Test for a query-string style filter. This
          // is only valid when the identifier before was
          // a containing element (same as when -Num for id is allowed).
          var filter;
          filter = querystring.parse(next);
          if (filter) {
            var query = "";
            var keys = Object.keys(filter);
            keys.forEach(function(key, i) {
              query += key + ' is "' + filter[key] + '"';
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
    this._vars.forEach(function(v, i) {
      vars += 'set ' + v.name + ' to (' + v.prop +
        (i>0 ? ' of ' + this._vars[i-1].name : '') +
        (v.query ? ' whose ' + v.query : '') +
        ')\n';
    }, this);
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
    return finalVar ? finalVar.name : null;
  }
});

nSpecifier.setNClass = function(nclass) {
  nClass = nclass;
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