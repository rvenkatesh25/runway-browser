"use strict";

let errors = require('../errors.js');
let Type = require('./type.js');
let Value = require('./value.js');

// An instance of an EitherVariant.
// 'type' is the EitherType and doesn't change,
// 'varianttype' is the current EitherVariant.
// If the variant has record fields, those fields will be in an attribute named
// after the variant name.
class EitherValue extends Value {
  constructor(type, varianttype) {
    super(type);
    this.varianttype = varianttype;
    if (this.varianttype.recordtype === null) {
      // enumvariant has no fields: do nothing
    } else {
      this[this.tag()] = this.varianttype.recordtype.makeDefaultValue();
    }
  }

  assign(newValue) {
    if (newValue instanceof EitherValue && this.type == newValue.type) {
      let _ = delete this[this.tag()];
      this.varianttype = newValue.varianttype;
      if (this.tag() in newValue) {
        this[this.tag()] = newValue[this.tag()];
      }
    } else {
      throw new errors.Internal(`Cannot assign value of ${newValue} to ` +
        `either-type ${this.type.getName()}`);
    }
  }

  equals(other) {
    if (this.varianttype != other.varianttype) {
      return false;
    }
    if (this.tag() in this) {
      return this[this.tag()].equals(other[this.tag()]);
    } else {
      return true;
    }
  }

  innerToString() {
    if (this.tag() in this) {
      return this[this.tag()].toString();
    } else {
      return this.tag();
    }
  }

  tag() {
    return this.varianttype.name;
  }

  toString() {
    if (this.tag() in this) {
      let fields = this[this.tag()].innerToString();
      return `${this.tag()} { ${fields} }`;
    } else {
      return this.tag();
    }
  }
}

// In:
//   type T: either { A, B }
// this represents an A or a B, and its parenttype is T.
// Sometimes we know statically that we have an A or a B.
class EitherVariant extends Type {
  constructor(decl, env, name, parenttype) {
    super(decl, env, name);
    this.parenttype = parenttype;
    if (this.decl.kind == 'enumvariant') {
      this.recordtype = null;
      this.env.assignVar(this.name, new EitherValue(this.parenttype, this));
    } else {
      let makeType = require('./factory.js');
      this.recordtype = makeType(decl.type, this.env);
    }
  }

  toString() {
    return `${this.name} (EitherVariant)`;
  }
}

// The type T in:
//   type T: either { A, B }
// An EitherType is made up of a set of EitherVariant types (A and B in this
// example).
class EitherType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.variants = this.decl.fields.map(
      (field) => new EitherVariant(field, this.env, field.id.value, this)
    );
  }

  makeDefaultValue() {
    return new EitherValue(this, this.variants[0]);
  }

  toString() {
    let name = this.getName();
    if (name !== undefined) {
      return name;
    }
    return 'anonymous either';
  }
}

module.exports = {
  Variant: EitherVariant,
  Type: EitherType,
};
