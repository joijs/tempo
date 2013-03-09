// TODO: Any array-likes which are accepted as arguments should need to be converted into true Arrays
// before using generic methods like `map`, `filter`, and `slice` whenever the library is expecting an
// array to be generated from these methods.
var Resync = (function(Object, String, TypeError, RangeError, Error) {

	'use strict';

	// Override any `module` or `exports` variables which exist outside of this
	// scope; otherwise, some includes will try to mix into them.
	var module = null, exports = null;

	var Spawn = (function(Object, String, Error, TypeError) {

	'use strict';

	var create = Object.create,
		keys = Object.keys,
		getOwnPropertyNames = Object.getOwnPropertyNames,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
		defineProperty = Object.defineProperty,
		getPrototypeOf = Object.getPrototypeOf,
		isExtensible = Object.isExtensible,

		lazyBind = Function.prototype.bind.bind(Function.prototype.call),

		slice = lazyBind(Array.prototype.slice),
		push = lazyBind(Array.prototype.push),
		forEach = lazyBind(Array.prototype.forEach),
		some = lazyBind(Array.prototype.some),
		reverse = lazyBind(Array.prototype.reverse),
		contact = lazyBind(Array.prototype.concat),
		join = lazyBind(Array.prototype.join),
		filter = lazyBind(Array.prototype.filter),

		call = lazyBind(Function.prototype.call),
		apply = lazyBind(Function.prototype.apply),

		isPrototypeOf = lazyBind(Object.prototype.isPrototypeOf),
		hasOwn = lazyBind(Object.prototype.hasOwnProperty),
		getTagOf = lazyBind(Object.prototype.toString),

		replace = lazyBind(String.prototype.replace),

	 	// `eval` is reserved in strict mode.
	 	// Also, we want to use indirect eval so that implementations can take advantage
	 	// of memory & performance enhancements which are possible without direct eval.
		_eval = eval,

		// Returns a clone of an object's own properties without a [[Prototype]].
		own = function own(obj) {
			if (obj == null || getPrototypeOf(obj) == null)
				return obj;
			var O = create(null);
			forEach(getOwnPropertyNames(obj), function(key) {
				defineProperty(O, key,
					getOwnPropertyDescriptor(obj, key));
			});
			return O;
		},

		beget = function beget(/* proto, props */) {

			var proto = arguments[0] != null ? Object(arguments[0]) : null,
				props = arguments[1] != null ? Object(arguments[1]) : null;

			return create(proto, props != null ? propsToDescriptors(own(props), proto) : undefined);

		},

		spawn = function spawn(obj/*, ...args */) {
			// spawn is beget + construct.

			var O = create(obj),
				construct = O.construct;

			// TODO: Only pass own() versions of the objects to the constructor?
			if (typeof construct == 'function')
				apply(construct, O, slice(arguments, 1));

			return O;

		},

		// Creates a wrapper function with the same length as the original.
		createWrapper = (function() {

			// Let's memoize wrapper generators to avoid using eval too often.
			var generators = { },

				numGenerators = 0,

				// Let's limit length to 512 for now. If someone wants to up it, they can.
				MAX_WRAPPER_LENGTH = 512,

				// Limit the number of generators which are cached to preserve memory in the unusual case that
				// someone creates many generators. We don't go to lengths to make the cache drop old, unused
				// values as there really shouldn't be a need for so many generators in the first place.
				MAX_CACHED_GENERATORS = 64;

			return function createWrapper(/* original, length, f */$0, $1) {

				var original = arguments[0];

				if (typeof original != 'function')
					throw new TypeError('Function expected: ' + original);

				var length = typeof arguments[2] != 'undefined' ? arguments[1] : original.length,
					f = typeof arguments[2] != 'undefined' ? arguments[2] : arguments[1];

				if (length < 0) length = 0;
				length = length >>> 0;
				if (length > MAX_WRAPPER_LENGTH)
					throw new Error('Maximum length allowed is ' + MAX_WRAPPER_LENGTH + ': ' + length);

				var args = [ ],
					generator = generators[length];

				if (typeof f != 'function')
					throw new TypeError('Function expected: ' + f);

				if (!generator) {

					for (var i = 0; i < length; i++)
						push(args, '$' + i);

					generator = _eval(
						'(function(wrapF, original, name, apply, _eval) {'
							+ '"use strict";'
							+ 'var wrapper = _eval("(function(wrapF, original, name, apply) {'
								+ 'return (function " + name + "_(' + join(args, ',') + ') {'
									+ 'return apply(wrapF, this, arguments);'
								+ '});'
							+ '})");'
							+ 'wrapper.original = original;'
							+ 'return wrapper(wrapF, original, name, apply);'
						+ '})'
					);

					if (numGenerators < MAX_CACHED_GENERATORS) {
						generators[length] = generator;
						numGenerators++;
					}

				}

				return generator(f, original, replace(original.name, /\W/g, '_'), apply, _eval);

			};

		})(),

		invert = function invert(f/*, length*/) {
			var length = arguments[1];
			return createWrapper(f, length, function wrapper() {
				var args;
				if (length !== undefined) {
					args = slice(arguments, 0, length);
					args.length = length;
				} else {
					args = slice(arguments);
				}
				return apply(f, null, reverse(args));
			});
		},

		inherits = invert(isPrototypeOf, 2),

		propsToDescriptors = function propsToDescriptors(props, base) {

			var desc = create(null);

			forEach(getUncommonPropertyNames(props, base), function(name) {
				var d = own(getOwnPropertyDescriptor(props, name));
				if (inherits(d.value, Descriptor))
					d = d.value;
				else
					d.enumerable = false;
				desc[name] = d;
			});

			return desc;

		},

		getUncommonPropertyNames = (function() {
			return function getUncommonPropertyNames(from, compareWith) {
				var namesMap = create(null);
				return filter(
					concatUncommonNames(from, compareWith),
					function(u) {
						if (namesMap[u]) return false;
						namesMap[u] = true;
						return true;
					}
				);
			};
			function concatUncommonNames(from, compareWith) {
				if (Object(from) != from
					|| from === compareWith
					|| inherits(compareWith, from)) return [ ];
				return contact(getOwnPropertyNames(from),
					concatUncommonNames(getPrototypeOf(from), compareWith));
			}
		})(),

		getPropertyDescriptor = function getPropertyDescriptor(obj, name) {
			if (Object(obj) !== obj) return undefined;
			return getOwnPropertyDescriptor(obj, name)
				|| getPropertyDescriptor(getPrototypeOf(obj), name);
		},

		Descriptor = create(null),

		sealed = function sealed(value) {
			return beget(Descriptor, {
				value: value,
				enumerable: false,
				writable: true,
				configurable: false
			});
		},

		frozen = function frozen(value) {
			return beget(Descriptor, {
				value: value,
				enumerable: false,
				writable: false,
				configurable: false
			});
		},

		mixin = function mixin(mixinWhat/*, ...mixinWith */) {

			var mixinWith;

			if (Object(mixinWhat) != mixinWhat)
				throw new TypeError('Cannot mixin a non-object: ' + mixinWhat);

			if (!isExtensible(mixinWhat))
				throw new Error('Cannot mixin on non-exensible object');

			for (var i = 1; i < arguments.length; i++) {

				mixinWith = Object(arguments[i]);

				forEach(getUncommonPropertyNames(mixinWith, mixinWhat), function(name) {

					var whatDesc = own(getPropertyDescriptor(mixinWhat, name)),
						withDesc = own(getPropertyDescriptor(mixinWith, name));

					if (!whatDesc || whatDesc.configurable)
						// If mixinWhat does not already have the property, or if mixinWhat
						// has the property and it's configurable, add it as is.
						defineProperty(mixinWhat, name, withDesc);
					else if (whatDesc.writable && 'value' in withDesc)
						// If the property is writable and the withDesc has a value, write the value.
						mixinWhat[name] = withDesc.value;

				});
			}

			return mixinWhat;

		},

		extend = function extend(extendWhat/*, ...extendWith */) {

			var extendWith, descriptors;

			if (Object(extendWhat) != extendWhat)
				throw new TypeError('Cannot call extend on a non-object: ' + extendWhat);

			if (!isExtensible(extendWhat))
				throw new Error('Cannot extend non-exensible object');

			for (var i = 1; i < arguments.length; i++) {

				extendWith = Object(arguments[i]);

				descriptors = propsToDescriptors(own(extendWith), extendWhat);

				// We define these one at a time in case a property on extendWhat is non-configurable.
				forEach(keys(descriptors), function(name) {

					var whatDesc = own(getOwnPropertyDescriptor(extendWhat, name)),
						withDesc = descriptors[name];

					if (!whatDesc || whatDesc.configurable)
						defineProperty(extendWhat, name, withDesc);
					else if (whatDesc.writable && 'value' in withDesc)
						extendWhat[name] = withDesc.value;

				});

			}

			return extendWhat;

		};

	return beget(null, {

		beget: beget,
		spawn: spawn,

		frozen: frozen,
		sealed: sealed,

		inherits: inherits,
		extend: extend,
		mixin: mixin

	});

})(Object, String, Error, TypeError);

// exports
if (typeof module == 'object' && module != null
	&& typeof module.exports == 'object' && module.exports != null)
	module.exports = Spawn;;
	var createSecret = (function(Object, String) {

	'use strict';

	// If this is not an ES5 environment, we can't do anything.
	if (
		/* We'll at least need the following functions.
		 * While not exhaustive, this should be a good enough list to make sure
		 * we're in an ES5 environment.
		 */
		!Object.getOwnPropertyNames
		|| !Object.getOwnPropertyDescriptor
		|| !Object.defineProperty
		|| !Object.defineProperties
		|| !Object.keys
		|| !Object.create
		|| !Object.freeze
		|| !Object.isExtensible
	)
		return function NoES5() {
			throw new Error('An ECMAScript 5 environment was not detected.');
		};

	// We capture the built-in functions and methods as they are now and store them as references so that we can
	// maintain some integrity. This is done to prevent scripts which run later from mischievously trying to get
	// details about or alter the secrets stored on an object.
	var lazyBind = Function.prototype.bind.bind(Function.prototype.call),

		// ES5 functions
		create = Object.create,
		getPrototypeOf = Object.getPrototypeOf,
		isExtensible = Object.isExtensible,
		freeze = Object.freeze,
		keys = Object.keys,
		getOwnPropertyNames = Object.getOwnPropertyNames,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
		defineProperty = Object.defineProperty,
		hasOwn = lazyBind(Object.prototype.hasOwnProperty),
		push = lazyBind(Array.prototype.push),
		forEach = lazyBind(Array.prototype.forEach),
		map = lazyBind(Array.prototype.map),
		filter = lazyBind(Array.prototype.filter),
		join = lazyBind(Array.prototype.join),
		fromCharCode = String.fromCharCode,
		apply = lazyBind(Function.prototype.apply),
		bind = lazyBind(Function.prototype.bind),

		// ES Harmony functions
		getPropertyNames = Object.getPropertyNames,

		// ES.next strawman functions
		getPropertyDescriptors = Object.getPropertyDescriptors,
		getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors,

		// ES Harmony constructors
		_Proxy = typeof Proxy == 'undefined' ? undefined : Proxy,

		// Determines whether object[SECRET_KEY] should expose the secret map.
		locked = true,

		random = getRandomGenerator(),
		MIN_PRECISION = -Math.pow(2, 53),
		MAX_PRECISION = -MIN_PRECISION,
		// idNum will ensure identifiers are unique.
		idNum = [ MIN_PRECISION ],
		preIdentifier = randStr(7) + '0',
		SECRET_KEY = '!S:' + getIdentifier(),

		protoIsMutable = (function() {
			// TODO: Keep up-to-date with whether ES6 goes with __proto__ or Reflect.setPrototypeOf.
			var A = create(null),
				A2 = create(null),
				B = create(A);
			B.__proto__ = A2;
			return getPrototypeOf(B) === A2;
		})();

	(function() {
		// Override get(Own)PropertyNames and get(Own)PropertyDescriptors to hide SECRET_KEY.

		var overrides = create(null);

		overrides.getOwnPropertyNames = getOwnPropertyNames
		if (getPropertyNames) overrides.getPropertyNames = getPropertyNames;

		keys(overrides).forEach(function(u) {
			var original = overrides[u];
			defineProperty(Object, u, {
				value: function(obj) {
					return filter(apply(original, this, arguments), function(u) {
						return u != SECRET_KEY;
					});
				},
				enumerable: false,
				writable: true,
				configurable: true
			});
		});

		overrides = create(null);

		if (getPropertyDescriptors) overrides.getPropertyDescriptors = getPropertyDescriptors;
		if (getOwnPropertyDescriptors) overrides.getOwnPropertyDescriptors = getOwnPropertyDescriptors;

		keys(overrides).forEach(function(u) {
			var original = overrides[u];
			defineProperty(Object, u, {
				value: function(obj) {
					var desc = apply(original, this, arguments);
					delete desc[SECRET_KEY];
					return desc;
				},
				enumerable: false,
				writable: true,
				configurable: true
			});
		});

	})();

	// Override functions which prevent extensions on objects to go ahead and add a secret map first.
	[ 'preventExtensions', 'seal', 'freeze' ].forEach(function(u) {
		var original = Object[u];
		defineProperty(Object, u, {
			value: function(obj) {
				// Define the secret map.
				Secrets(obj);
				return apply(original, this, arguments);
			}
		});
	});

	if (typeof _Proxy == 'function') {

		Proxy = (function() {
			/* TODO: This works for "direct_proxies", the current ES6 draft; however, some browsers have
			 * support for an old draft (such as FF 17 and below) which uses Proxy.create(). Should this
			 * version be overridden to protect against discovery of SECRET_KEY on these browsers also?
			 */

			var trapBypasses = create(null);
			trapBypasses.defineProperty = defineProperty;
			trapBypasses.hasOwn = hasOwn;
			trapBypasses.get = function(target, name) { return target[name]; };

			return function Proxy(target, traps) {

				if (!(this instanceof Proxy)) {
					// TODO: The new keyword wasn't used. What should be done?
					return new Proxy(target, traps);
				}

				var _traps = create(traps);

				forEach(keys(trapBypasses), function(trapName) {
					var bypass = trapBypasses[trapName];
					if (typeof traps[trapName] == 'function') {
						// Override traps which could discover SECRET_KEY.
						_traps[trapName] = function(target, name) {
							if (name === SECRET_KEY) {
								// Bypass any user defined trap when name === SECRET_KEY.
								return apply(bypass, null, arguments);
							}
							return apply(traps[trapName], this, arguments);
						};
					}
				});

				return new _Proxy(target, _traps);
			};

		})();

	} else if (_Proxy && _Proxy.create) {

//		Proxy.create = (function() {
//
//			return function create(traps, proto) {
//				// TODO
//			};
//
//		})();

	}
	
	return function createSecret() {

		var id = nextUniqueId();

		return function secret(obj) {
			var secrets = Secrets(obj),
				S, proto, protoS, protoSTest;
			if (secrets) {
				S = secrets[id];
				if (!S) {
					proto = getPrototypeOf(obj);
					secrets[id] = S = create(proto ? secret(proto) : null);
				} else if (protoIsMutable) {
					// TODO: Keep up-to-date with whether ES6 goes with __proto__ or Reflect.setPrototypeOf.
					proto = getPrototypeOf(obj);
					protoS = getPrototypeOf(S);
					protoSTest = proto == null ? null : secret(proto);
					if (protoSTest !== protoS)
						S.__proto__ = protoSTest;
				}
				return S;
			} else
				// The object may have been frozen in another frame.
				throw new Error('This object doesn\'t support secrets.');
		};

	};

	function Secrets(O) {
		// Returns undefined if object doesn't already have Secrets and the object is non-extensible. This should
		// really only happen if an object is passed in from another frame, because in this frame preventExtensions
		// is overridden to add a Secrets property first.

		if (O !== Object(O)) throw new Error('Not an object: ' + O);
		if (!hasOwn(O, SECRET_KEY)) {
			if (!isExtensible(O)) return;
			defineProperty(O, SECRET_KEY, own({

				get: (function() {
					var secretMap = create(null);
					return function getSecret() {
						var value;
						// The lock protects against retrieval in the event that the SECRET_KEY is discovered.
						if (locked) return;
						locked = true;
						return secretMap;
					};
				})(),

				enumerable: false,
				configurable: false

			}));
		}
		locked = false;
		
		return O[SECRET_KEY];

	}

	function getIdentifier() {
		return preIdentifier + ':' + join(getRandStrs(8, 11), '/') + ':' + nextUniqueId();
	}

	function nextUniqueId() {
		idNum[0]++;
		for(var i = 0; idNum[i] >= MAX_PRECISION && i < idNum.length; i++) {
			idNum[i] = MIN_PRECISION;
			if (i < idNum.length) idNum[i + 1]++;
			else {
				// Reset and add a digit.
				idNum = map(idNum, function() { return MIN_PRECISION; });
				push(idNum, MIN_PRECISION);
				break;
			}
		}
		return '{' + join(idNum, ',') + '}';
	}

	function encodeStr(num) {
		return fromCharCode(num + 65);
	}

	function getRandStrs(count, length) {
		var r = [ ];
		for(var i = 0; i < count; i++) {
			push(r, randStr(length));
		}
		return r;
	}

	function randStr(length) {
		var s = '';
		for (var i = 0; i < length; i++) {
			s += encodeStr(random() * (125 - 65 + 1));
		}
		return s;
	}

	function getRandomGenerator() {
		var getRandomValues
			= typeof crypto != 'undefined' && crypto != null
				? (function() {
					var f = crypto.random || crypto.getRandomValues;
					if (f) return f.bind(crypto);
					return undefined;
				})()
				: undefined;
		if (getRandomValues) {
			// Firefox (15 & 16) seems to be throwing a weird "not implemented" error on getRandomValues.
			// Not sure why?
			try { getRandomValues(new Uint8Array(4)); }
			catch(x) { getRandomValues = undefined }
		}
		if (typeof getRandomValues == 'function' && typeof Uint8Array == 'function') {
			return (function() {
				var values = new Uint8Array(4), index = 4;
				return function random() {
					if (index >= values.length) {
						getRandomValues(values);
						index = 0;
					}
					return values[index++] / 256;
				};
			})();
		} else return Math.random;
	}

	function own(obj) {

		var O = create(null);

		forEach(getOwnPropertyNames(obj), function(key) {
			defineProperty(O, key,
				getOwnPropertyDescriptor(obj, key));
		});

		return O;

	}

// We pass in Object and String to ensure that they cannot be changed later to something else.
})(Object, String);

if (typeof exports != 'undefined' && exports != null)
	exports.createSecret = createSecret;;
	var __exports__ = (function() {
			var exports = Object.create(null);
			(function(Object, String, Number, Error, TypeError, RangeError, isNaN, Infinity, NaN) {

	'use strict';

	// TODO: Get a better detection & shimming system so that this isn't required.
	// Note: There's currently no way to forceShim on Node without modifying this file.
	var forceShim = typeof __Harmonize__ == 'object'
		&& __Harmonize__ != null
		&& __Harmonize__.forceShim;

	// TODO: BinaryData. We have decided not to implement BinaryData at this time because rev 11 of the draft states
	// that this section will be changed significantly, and warns not to waste too much time on it. We will wait for
	// a more final version.

	// If this is not an ES5 environment, we can't do anything.
	if (
		/* We'll at least need the following functions.
		 * While not exhaustive, this should be a good enough list to make sure
		 * we're in an ES5 environment.
		 */
		!Object.getOwnPropertyNames
		|| !Object.getOwnPropertyDescriptor
		|| !Object.defineProperty
		|| !Object.defineProperties
		|| !Object.keys
		|| !Object.create
		|| !Object.freeze
		|| !Object.isFrozen
		|| !Object.isExtensible)
		return;

	

	var undefined,

		_global = (0, eval)('this'),

		lazyBind = Function.prototype.bind.bind(Function.prototype.call),

		// We use these as functions rather than methods so that changes to Object and Array.prototype can't gain
		// unwelcome access to the internal workings of our shims.

		keys = Object.keys,
		create = Object.create,
		freeze = Object.freeze,
		seal = Object.seal,
		isFrozen = Object.isFrozen,
		isSealed = Object.isSealed,
		isExtensible = Object.isExtensible,
		getOwnPropertyNames = Object.getOwnPropertyNames,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
		getPrototypeOf = Object.getPrototypeOf,
		defineProperty = Object.defineProperty,
		hasOwn = lazyBind(Object.prototype.hasOwnProperty),
		toString = lazyBind(Object.prototype.toString),

		call = lazyBind(Function.prototype.call),
		bind = lazyBind(Function.prototype.bind),

		indexOf = lazyBind(Array.prototype.indexOf),
		forEach = lazyBind(Array.prototype.forEach),
		splice = lazyBind(Array.prototype.splice),
		sort = lazyBind(Array.prototype.sort),
		push = lazyBind(Array.prototype.push),
		concat = lazyBind(Array.prototype.concat),

		charCodeAt = lazyBind(String.prototype.charCodeAt),
		StringSlice = lazyBind(String.prototype.slice),
		StringIndexOf = lazyBind(String.prototype.indexOf),

		floor = Math.floor,
		abs = Math.abs,
		min = Math.min,
		max = Math.max,

		Secrets = (function() {
			var $ = createSecret(),
				SecretsMethods = {
					get: function get(name) {
						return this.store[name];
					},
					// Note: This is really `hasOwn` because ECMAScript does not allow prototypal
					// inheritence of internal properties. :(
					has: function hasOwn_(name) {
						return hasOwn(this.store, name);
					},
					set: function set(name, value) {
						return this.store[name] = value;
					},
					delete: function delete_(name) {
						return delete this.store[name];
					}
				};
			return function Secrets(obj) {
				if (obj == null)
					throw new TypeError('Cannot call Secrets on null or undefined.');
				var O = Object(obj),
					secrets = $(O);
				if (secrets && !hasOwn(secrets, 'store')) {
					secrets.store = create(null);
					forEach(keys(SecretsMethods), function(key) {
						secrets[key] = SecretsMethods[key];
					});
				}
				return secrets;
			}
		})(),

		// Symbol operators:
		$$HAS = function($obj, symbolName) {
			return symbolName in $obj;
		},
		$$DELETE = function($obj) {
			return delete $obj[symbolName];
		},

		$$ = (function() {
			var _$$ = createSecret();
			return function(/* symbolOperator, */obj, symbolName/*, value */) {
				// This function should be possible to write in a way that would be
				// compatible with ES6 symbols.
				// TODO: When ES6 symbols are implemented, rewrite this to work with @@iterator, etc.
				if (arguments[0] === $$HAS
					|| arguments[0] === $$DELETE) {
					return arguments[0](_$$(arguments[1]), arguments[2]);
				}
				if (arguments.length > 2)
					return _$$(obj)[symbolName] = arguments[2];
				else
					return _$$(obj)[symbolName];
			};
		})();

	// TODO: Check rev. 12 of the draft when it comes out and see if get, has, delete should throw when passed a non-object.
var WeakMap = (function() {

	var wmNumber = 0,

		NO_SECRETS = { NO_SECRETS: true };

	function WeakMapInitialisation(obj, iterable) {
		// 15.15.1.1 MapInitialisation

		// The abstract operation WeakMapInitialisation with arguments obj and iterable is used to initialize an object
		// as a map. It performs the following steps:

		// 1. If Type(obj) is not Object, throw a TypeError exception.
		if (Object(obj) != obj)
			throw new TypeError('Object expected: ' + obj);

		var S = Secrets(obj);

		// [The following line is in line with step 3. Note that step 3 is still performed below because a secrets object
		// can be returned even if the object is not extensible.]
		if (!S) throw new TypeError('Object is not extensible.');

		// 2. If obj already has a [[WeakMapData]] internal property, throw a TypeError exception.
		if (S.has('[[WeakMapData]]'))
			throw new TypeError('Object is a WeakMap.');

		// 3. If the [[Extensible]] internal property of obj is false, throw a TypeError exception.
		if (!Object.isExtensible(obj))
			throw new TypeError('Object is not extensible.');

		var iterator, itr, adder;

		// 4. If iterable is not undefined, then
		if (iterable !== undefined) {

			// a. Let iterable be ToObject(iterable).
			// b. ReturnIfAbrupt(iterable)
			iterable = Object(iterable);

			// c. Let iterator be the intrinsic symbol @@iterator.
			// d. Let itr be the result of calling the Invoke abstraction operation with iterator, obj, and an empty
			// List as arguments.
			// e. ReturnIfAbrupt(itr).
			// TODO: Should this be iterable instead of obj?
			itr = call($$(obj, 'iterator'), obj);

			// f. Let adder be the result of calling the [[Get]] internal method of obj with argument "set".
			// g. ReturnIfAbrupt(adder).
			adder = obj.set;

			// h. If IsCallable(adder) is false, throw a TypeError Exception.
			if (typeof adder != 'function')
				throw new TypeError('Property "set" is not a function.');

		}

		// 5. Add a [[WeakMapData]] internal property to obj.
		// 6. Set obj’s [[WeakMapData]] internal property to a new empty List.
		S.set('[[WeakMapData]]', create(null));
		S.set('#weakMapRecordId', 'WeakMap:id:' + (wmNumber++));

		// 7. If iterable is undefined, return obj.
		if (iterable === undefined) return obj;

		var next, k, v;

		// 8. Repeat
		while(true) {

			try {

				// a. Let next be the result of performing Invoke with arguments "next", itr, and an empty arguments
				// List.
				next = itr.next();

			} catch(x) {

				// b. If IteratorComplete(next) is true, then return NormalCompletion(obj).
				if (getTagOf(x) == 'StopIteration') return obj;
				else throw x;

			}

			// c. Let next be ToObject(next).
			// d. ReturnIfAbrupt(next).
			next = Object(next);

			// e. Let k be the result of calling the [[Get]] internal method of next with argument "0".
			// f. ReturnIfAbrupt(k).
			k = next[0];

			// g. Let v be the result of calling the [[Get]] internal method of next with argument "1".
			// h. ReturnIfAbrupt(v).
			v = next[1];

			// i. Let status be the result of calling the [[Call]] internal method of adder with obj as thisArgument
			// and a List whose elements are k and v as argumentsList.
			// j. ReturnIfAbrupt(status).
			call(adder, obj, k, v);

		}

	}

	function WeakMapFunction(iterable) {
		// 15.15.2 The WeakMap Constructor Called as a Function

		// When WeakMap is called as a function rather than as a constructor, it initializes its this value with the
		// internal state necessary to support the WeakMap.prototype internal methods. This premits super invocation of
		// the WeakMap constructor by WeakMap subclasses.

		// 15.15.2.1 WeakMap (iterable = undefined )

		// 1. Let m be the this value.
		var m = this;

		var map;

		// 2. If m is undefined or the intrinsic %WeakMapPrototype%
		if (m === undefined || m === WeakMap.prototype)

			// a. Let map be the result of the abstract operation ObjectCreate (15.2) with the intrinsic
			// %WeakWeakMapPrototype% as the argument.
			map = create(WeakMap.prototype);

		// 3. Else
		else

			// a. Let map be the result of ToObject(m).
			map = Object(m);

		// 4. ReturnIfAbrupt(map).

		// 5. If iterable is not present, let iterable be undefined.

		// 6. Let status be the result of MapInitialisation with map and iterable as arguments.
		// 7. ReturnIfAbrupt(status).
		WeakMapInitialisation(map, iterable);

		// 8. Return map.
		return map;

	}

	function WeakMapConstructor(iterable) {
		// 15.15.3.1 new WeakMap (iterable = undefined )

		// 1. Let map be the result of the abstract operation ObjectCreate (15.2) with the intrinsic %WeakMapPrototype%
		// as the argument.
		var map = this;

		// 2. If iterable is not present, let iterable be undefined.

		// 3. Let status be the result of WeakMapInitialisation with map and iterable as arguments.
		// 4. ReturnIfAbrupt(status).
		WeakMapInitialisation(map, iterable);

		// 5. Return map.
		// [This step is automatic.]

	}

	function WeakMap(/* iterable */) {

		var S, iterable = arguments[0];

		// [WeakMap.prototype will always be the firstborn, since this property is non-configurable and non-writable.]
		if (this instanceof WeakMap
			&& this != WeakMap.prototype
			&& (S = Secrets(this))
			&& !S.has('WeakMap:#constructed')
		) {

			call(WeakMapConstructor, this, iterable);
			S.set('WeakMap:#constructed', true);

		} else return call(WeakMapFunction, this, iterable);

	}

	// 15.15.4.1 WeakMap.prototype
	// The initial value of WeakMap.prototype is the WeakMap prototype object (15.15.4).
	// This property has the attributes { [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: false }.
	defineProperty(WeakMap, 'prototype', {
		value: WeakMap.prototype,
		enumerable: false,
		writable: false,
		configurable: false
	});

	defineValuesWC(WeakMap.prototype, {

		clear: function clear() {
			// 15.15.5.2 WeakMap.prototype.clear()

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[WeakMapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[WeakMapData]]'))
				throw new TypeError('Object is not a WeakMap.');

			// 4. Set the value of M’s [[WeakMapData]] internal property to a new empty List.
			S.set('[[WeakMapData]]', create(null));
			S.set('#weakMapRecordId', 'WeakMap:id:' + (wmNumber++));

			// 5. Return undefined.

		},

		delete: function delete_(key) {
			// 15.15.5.3 WeakMap.prototype.delete ( key )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[WeakMapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[WeakMapData]]'))
				throw new TypeError('Object is not a WeakMap.');

			// 4. Let entries be the List that is the value of M’s [[WeakMapData]] internal property.
			var entries = S.get('[[WeakMapData]]');

			// 5. Let k be ToObject(key).
			// 6. ReturnIfAbrupt(k).
			var k = Object(key);

			var p;

			// [We deviate from the steps to keep the weak, O(1) intent of the WeakMap.]
			if ((p = deleteRecord(S, k)) && p === true)
				return true;

			else if(p === NO_SECRETS) {
				// [If the weak intent cannot be kept, we fall back to non-weak, O(n) steps.]

				// 7. Repeat for each Record {[[key]], [[value]]} p that is an element of entries,
				for (var i = 0; i < entries.length; i++) {
					p = entries[i];

					// a. If SameValue(p.[[key]], k), then
					if (is(p.key, k)) {

						// i.   Set p.[[key]] to empty.
						delete p.key;

						// ii.  Set p.[[value]] to empty.
						delete p.value;

						// [This operation is not specified, but it can improve efficiency.]
						splice(entries, i, 1);

						// iii. Return true.
						return true;

					}

				}

			}

			// 8. Return false.
			return false;

		},

		get: function get(key) {
			// 15.15.5.4 WeakMap.prototype.get ( key )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value the as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[WeakMapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[WeakMapData]]'))
				throw new TypeError('Object is not a WeakMap.');

			// 4. Let entries be the List that is the value of M’s [[WeakMapData]] internal property.
			var entries = S.get('[[WeakMapData]]');

			// 5. Let k be ToObject(key).
			// 6. ReturnIfAbrupt(k).
			var k = Object(key);

			var p;

			// [We deviate from the steps to keep the weak, O(1) intent of the WeakMap.]
			if ((p = getRecord(S, k)) && p !== NO_SECRETS)
				return p;

			else if(p === NO_SECRETS) {
				// [If the weak intent cannot be kept, we fall back to non-weak, O(n) steps.]

				// 7. Repeat for each Record {[[key]], [[value]]} p that is an element of entries,
				for (var i = 0; i < entries.length; i++) {
					p = entries[i];

					// a. If SameValue(p.[[key]], k), then return p.[[value]]
					if (is(p.key, k))
						return p.value;

				}

			}

			// 8. Return undefined.

		},

		has: function has(key) {
			// 15.15.5.4 WeakMap.prototype.get ( key )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value the as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[WeakMapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[WeakMapData]]'))
				throw new TypeError('Object is not a WeakMap.');

			// 4. Let entries be the List that is the value of M’s [[WeakMapData]] internal property.
			var entries = S.get('[[WeakMapData]]');

			// 5. Let k be ToObject(key).
			// 6. ReturnIfAbrupt(k).
			var k = Object(key);

			var p;

			// [We deviate from the steps to keep the weak, O(1) intent of the WeakMap.]
			if ((p = getRecord(S, k)) && p !== NO_SECRETS)
				return true;

			else if(p === NO_SECRETS) {
				// [If the weak intent cannot be kept, we fall back to non-weak, O(n) steps.]

				// 7. Repeat for each Record {[[key]], [[value]]} p that is an element of entries,
				for (var i = 0; i < entries.length; i++) {
					p = entries[i];

					// a. If SameValue(p.[[key]], k), then return true.
					if (is(p.key, k))
						return true;

				}

			}

			// 8. Return false.
			return false;

		},

		set: function set(key, value) {
			// 15.14.5.6 WeakMap.prototype.set ( key , value )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(this);

			// 3. If M does not have a [[WeakMapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[WeakMapData]]'))
				throw new TypeError('Object is not a WeakMap.');

			// 4. Let entries be the List that is the value of M’s [[WeakMapData]] internal property.
			var entries = S.get('[[WeakMapData]]');

			// 5. If Type(key) is not Object, then throw a TypeError exception.
			if (Object(key) !== key)
				throw new TypeError('WeakMap key must be an object: ' + key);

			var p;

			// [We deviate from the steps to keep the weak, O(1) intent of the WeakMap.]
			if ((p = setRecord(S, key, value)) && p === NO_SECRETS) {
				// [If the weak intent cannot be kept, we fall back to non-weak, O(n) steps.]

				// 6. Repeat for each Record {[[key]], [[value]]} p that is an element of entries,
				for (var i = 0; i < entries.length; i++) {
					p = entries[i];

					// a. If SameValue(p.[[key]], key), then
					if (is(p.key, key)) {

						// i.  Set p.[[value]] to value.
						p.value = value;

						// ii. Return undefined.
						return;

					}

				}

				// 7. Let p be the Record {[[key]]: k, [[value]]: value}
				p = create(null);
				p.key = key;
				p.value = value;

				// 8. Append p as the last element of entries.
				push(entries, p);

			}

			// 9. Return undefined.

		}

	});

	// 15.15.5.7 Map.prototype.@@toStringTag
	// The initial value of the @@toStringTag property is the string value "WeakMap".
	$$(WeakMap.prototype, 'toStringTag', 'WeakMap');

	function getRecord(S, k) {

		var Sk = Secrets(k),
			$weakMapRecordId;

		if (Sk) $weakMapRecordId = S.get('#weakMapRecordId');
		// Return NO_SECRETS if this object doesn't support Secrets
		else return NO_SECRETS;

		return Sk.getOwn($weakMapRecordId);
		// Returns undefined if the object supports Secrets but it had no WeakMap Record.

	}

	function setRecord(S, k, value) {

		var Sk = Secrets(k),
			$weakMapRecordId;

		if (Sk) $weakMapRecordId = S.get('#weakMapRecordId');
		// Return NO_SECRETS if this object doesn't support Secrets
		else return NO_SECRETS;

		Sk.set($weakMapRecordId, value);
		return true;

	}

	function deleteRecord(S, k) {

		var Sk = Secrets(k),
			$weakMapRecordId;

		if (Sk) $weakMapRecordId = S.get('#weakMapRecordId');
		// Return NO_SECRETS if this object doesn't support Secrets
		else return NO_SECRETS;

		var p = Sk.getOwn($weakMapRecordId);
		if (p) {
			Sk.delete($weakMapRecordId);
			// Return true if the record was successfully deleted.
			return true;
		}

		// Return false if the object supports Secrets but it had no WeakMap Record.
		return false;

	}

	return WeakMap;

})();
var ArrayOf = function of(/* ...items */) {

	var items = arguments;

	// 1. Let lenValue be the result of calling the [[Get]] internal method of items with the argument "length".
	var lenValue = items.length;

	// 2. Let len be ToInteger(lenValue).
	var len = NumberToInt(lenValue);

	// 3. Let C be the this value.
	var C = this;

	var newObj, A;

	// 4. If isConstructor(C) is true, then
	if (typeof C == 'function') {

		try {

			// a. Let newObj be the result of calling the [[Construct]] internal method of C with an argument
			// list containing the single item len.
			newObj = new C(len);

			// b. Let A be ToObject(newObj).
			A = Object(newObj);

		} catch(x) {
			// C was not a constructor.
		}

	}

	// 5. Else,
	if (A === undefined)
		// a. Let A be the result of the abstract operation ArrayCreate (15.4) with argument len.
		A = new Array(len);

	// 6. ReturnIfAbrupt(A).

	// 7. Let k be 0.
	var k = 0;

	var Pk, kValue;

	// 8. Repeat, while k < len
	while (k < len) {

		// a. Let Pk be ToString(k).
		Pk = String(k);

		// b. Let kValue be the result of calling the [[Get]] internal method of items with argument Pk.
		kValue = items[Pk];

		// c. Let defineStatus be the result of calling the [[DefineOwnProperty]] internal method of A with
		// arguments Pk, Property Descriptor {[[Value]]: kValue.[[value]], [[Writable]]: true, [[Enumerable]]: true,
		// [[Configurable]]: true}, and true.
		// d. ReturnIfAbrupt(defineStatus).
		defineProperty(A, Pk, {
			value: kValue,
			writable: true,
			enumerable: true,
			configurable: true
		});

		// e. Increase k by 1.
		k++;

	}

	// 9. Let putStatus be the result of calling the [[Put]] internal method of A with arguments "length", len,
	// and true.
	// 10. ReturnIfAbrupt(putStatus).
	A.length = len;

	// 11. Return A.
	return A;

};

var ArrayFrom = function from(arrayLike/*, mapFn */) {
	// Note: The mapFn argument is not in the spec yet, but it is expected.
	// TODO: Followup later and make sure it makes it to the spec.
	// TODO: ArrayFrom may also need to be generalized to create objects which
	// extend Array, such as TypedArrays.

	var mapFn = arguments[1];

	if (mapFn !== undefined && typeof mapFn != 'function')
		throw new TypeError('Function expected.');

	// 1. Let items be ToObject(arrayLike).
	// 2. ReturnIfAbrupt(items).
	var items = Object(arrayLike);

	// 3. Let lenValue be the result of calling the [[Get]] internal method of items with the argument "length".
	var lenValue = items.length;

	// 4. Let len be ToInteger(lenValue).
	// 5. ReturnIfAbrupt(len).
	var len = NumberToInt(lenValue);

	// 6. Let C be the this value.
	var C = this;

	var newObj, A;

	// 7. If isConstructor(C) is true, then
	if (typeof C == 'function') {
		try {

			// a. Let newObj be the result of calling the [[Construct]] internal method of C with an argument
			// list containing the single item len.
			newObj = new C(len);

			// b. Let A be ToObject(newObj).
			A = Object(newObj);

		} catch(x) {

		}
	}

	// 8. Else,
	if (A === undefined)

		// a. Let A be the result of the abstract operation ArrayCreate (15.4) with argument len.
		A = new Array(len);

	// 9. ReturnIfAbrupt(A).

	// 10. Let k be 0.
	var k = 0;

	var Pk, kPresent, kValue;

	// 11. Repeat, while k < len
	while (k < len) {

		// a. Let Pk be ToString(k).
		Pk = String(k);

		// b. Let kPresent be the result of calling the [[HasProperty]] internal method of items with
		// argument Pk.
		kPresent = Pk in items;

		// c. If kPresent is true, then
		if (kPresent) {

			// i. Let kValue be the result of calling the [[Get]] internal method of items with argument Pk.
			// ii. ReturnIfAbrupt(kValue).
			kValue = items[Pk];

			// iii. Let defineStatus be the result of calling the [[DefineOwnProperty]] internal method of A
			// with arguments Pk, Property Descriptor {[[Value]]: kValue.[[value]], [[Writable]]: true,
			// [[Enumerable]]: true, [[Configurable]]: true}, and true.
			// iv.	ReturnIfAbrupt(defineStatus).
			defineProperty(A, Pk, {
				value: mapFn === undefined ? kValue : mapFn(kValue),
				writable: true,
				enumerable: true,
				configurable: true
			});

		}

		// d.	Increase k by 1.
		k++;

	}

	// 12. Let putStatus be the result of calling the [[Put]] internal method of A with arguments "length",
	// len, and true.
	// 13. ReturnIfAbrupt(putStatus).
	A.length = len;

	// 14. Return A.
	return A;

};

var ArrayProtoContains = function contains(value) {
	// Note: It's uncertain whether this will go with egal, ===, or a mixture from recent ES6 discussions.
	// For now, we have chosen to throw if 0 or NaN is used, since we don't know how ES6 will behave in these
	// circumstances. That should make this implementation a subset of the future ES6 specification, which will
	// prevent code using it from breaking once the ES6 specification version is complete and implemented.
	// TODO: Keep up with the spec as it evolves and what algorithm it ends up using for comparison.

	if (value !== value || value === 0)
		throw new Error('Invalid value: ' + value);

	var O = Object(this),
		L = O.length >>> 0;

	// We also expect the spec will allow contains to be called on non-objects, but we throw for now because
	// it is the most forward compatible solution (just in case the spec ends up throwing for non-objects).
	if (O !== this)
		throw new Error('contains called on non-object.');

	return !!~indexOf(O, value);

};

var ArrayProtoItems = function items() {
	// 15.4.4.23 Array.prototype.items ( )
	// The following steps are taken:

	// 1. Let O be the result of calling ToObject with the this value as its argument.
	// 2. ReturnIfAbrupt(O).
	var O = Object(this);

	// 3. Return the result of calling the CreateArrayIterator abstract operation with arguments O and
	// "key+value".
	return CreateArrayIterator(O, 'key+value');

};

var ArrayProtoKeys = function keys() {
	// 15.4.4.24 Array.prototype.keys ( )
	// The following steps are taken:

	// 1. Let O be the result of calling ToObject with the this value as its argument.
	// 2. ReturnIfAbrupt(O).
	var O = Object(this);

	// 3. Return the result of calling the CreateArrayIterator abstract operation with arguments O and "key".
	return CreateArrayIterator(O, 'key');

};

var ArrayProtoValues = function values() {
	// 15.4.4.25 Array.prototype.values
	// The following steps are taken:

	// 1. Let O be the result of calling ToObject with the this value as its argument.
	// 2. ReturnIfAbrupt(O).
	var O = Object(this);

	// 3. Return the result of calling the CreateArrayIterator abstract operation with arguments O and "value".
	return CreateArrayIterator(O, 'value');

};

shimProps(Array, {
	of: ArrayOf,
	from: ArrayFrom
});

shimProps(Array.prototype, {
	contains: ArrayProtoContains,
	items: ArrayProtoItems,
	keys: ArrayProtoKeys,
	values: ArrayProtoValues
});

// 15.4.4.26 Array.prototype.@@iterator ( )
// The initial value of the @@iterator property is the same function object as the initial value of the
// Array.prototype.items property.
// TODO: Check later drafts; rev. 11 has a comment saying: "Or should it be values?" so it could change.
// TODO: When @@iterator is available in implementations find a way to set like: $$(Array.prototype, 'iterator', @@iterator).
// TODO: Changing `items` to `values` seems to fix some stuff, but would it be right to do?
$$(Array.prototype, 'iterator', Array.prototype.values);

function CreateArrayIterator(array, kind) {
	// 15.4.6.1 CreateArrayIterator Abstract Operation
	// Several methods of Array objects return iterator objects. The abstract operation CreateArrayIterator with
	// arguments array and kind is used to create and such iterator objects. It performs the following steps:

	// 1. Let O be the result of calling ToObject(array).
	// 2. ReturnIfAbrupt(O).
	var O = Object(array);

	// 3. Let itr be the result of the abstract operation ObjectCreate with the intrinsic object
	// %ArrayIteratorPrototype% as its argument.
	var itr = create(ArrayIteratorPrototype);

	var S = Secrets(itr);

	// 4. Add a [[IteratedObject]] internal property to itr with value O.
	S.set('[[IteratedObject]]', O);

	// 5. Add a [[ArrayIteratorNextIndex]] internal property to itr with value 0.
	S.set('[[ArrayIteratorNextIndex]]', 0);

	// 6. Add a [[ArrayIterationKind]] internal property of itr with value kind.
	S.set('[[ArrayIterationKind]]', kind);

	// 7. Return itr.
	return itr;

}

var ArrayIteratorPrototype = {

	next: function next() {
		// 15.4.6.2.2 ArrayIterator.prototype.next( )

		// 1. Let O be the this value.
		var O = this;

		// 2. If Type(O) is not Object, throw a TypeError exception.
		if (Object(O) != O)
			throw new TypeError('Object expected: ' + O);

		var S = Secrets(O);

		// 3. If O does not have all of the internal properties of a Array Iterator Instance (15.4.6.1.2), throw a
		// TypeError exception.
		if (!S
			|| !S.has('[[IteratedObject]]')
			|| !S.has('[[ArrayIteratorNextIndex]]'
			|| !S.has('[[ArrayIterationKind]]')))
			throw new TypeError('ArrayIterator expected.');

		// 4. Let a be the value of the [[IteratedObject]] internal property of O.
		var a = S.get('[[IteratedObject]]');

		// 5. Let index be the value of the [[ArrayIteratorNextIndex]] internal property of O.
		var index = S.get('[[ArrayIteratorNextIndex]]');

		// 6. Let itemKind be the value of the [[ArrayIterationKind]] internal property of O.
		var itemKind = S.get('[[ArrayIterationKind]]');

		// 7. Let lenValue be the result of calling the [[Get]] internal method of a with the argument "length".
		var lenValue = a.length;

		// 8. Let len be ToUint32(lenValue).
		// 9. ReturnIfAbrupt(len).
		var len = lenValue >>> 0;

		var found, elementKey;

		// 10. If itemKind contains the substring "sparse", then
		if (~StringIndexOf(itemKind, 'sparse')) {

			// a. Let found be false.
			found = false;

			// b. Repeat, while found is false and index < len
			while (!found && index < len) {

				// i. Let elementKey be ToString(index).
				elementKey = String(index);

				// ii. Let found be the result of calling the [[HasProperty]] internal method of a with argument
				// elementKey.
				found = elementKey in a;

				// iii. If found is false, then
				if (!found)

					// 1. Increase index by 1.
					index++;

			}

		}

		// 11. If index ≥ len, then
		if (index >= len) {

			// a. Set the value of the [[ArrayIteratorNextIndex]] internal property of O to +Infinity.
			S.set('[[ArrayIteratorNextIndex]]', Infinity);

			// b. Return Completion {[[type]]: throw, [[value]]: %StopIteration%, [[target]]: empty}.
			throw StopIteration;

		}

		// 12. Let elementKey be ToString(index).
		elementKey = String(index);

		// 13. Set the value of the [[ArrayIteratorNextIndex]] internal property of O to index+1.
		S.set('[[ArrayIteratorNextIndex]]', index + 1);

		var elementValue, result;

		// 14. If itemKind contains the substring "value", then
		if (~StringIndexOf(itemKind, 'value'))

			// a. Let elementValue be the result of calling the [[Get]] internal method of a with argument
			// elementKey.
			// b. ReturnIfAbrupt(elementValue).
			elementValue = a[elementKey];

		if (~StringIndexOf(itemKind, 'key+value')) {
		// 15. If itemKind contains the substring "key+value", then

			// a. Let result be the result of the abstract operation ArrayCreate with argument 2.
			// b. Assert: result is a new, well-formed Array object so the following operations will never fail.
			result = new Array(2);

			// c. Call the [[DefineOwnProperty]] internal method of result with arguments "0", Property Descriptor
			// {[[Value]]:	elementKey, [[Writable]]: true, [[Enumerable]]: true, [[Configurable]]: true}, and
			// false.
			result[0] = elementKey;

			// d. Call the [[DefineOwnProperty]] internal method of result with arguments "1", Property Descriptor
			// {[[Value]]: elementValue, [[Writable]]: true, [[Enumerable]]: true, [[Configurable]]: true}, and
			// false.
			result[1] = elementValue;

			// e. Return result.
			return result;

		}

		// 16. Else If itemKind contains the substring "key" then, return elementKey.
		else if(~StringIndexOf(itemKind, 'key'))
			return elementKey;

		// 17. Else itemKind is "value",
		else if(itemKind === 'value')

			// a. Return elementValue.
			return elementValue;

	}

};

$$(ArrayIteratorPrototype, 'iterator', function $$iterator() {
	// 15.4.6.2.3 ArrayIterator.prototype.@@iterator ( )
	// The following steps are taken:

	// 1. Return the this value.
	return this;

});

// 15.4.6.2.4 ArrayIterator.prototype.@@toStringTag
// The initial value of the @@toStringTag property is the string value "Array Iterator".
$$(ArrayIteratorPrototype, 'toStringTag', 'Array Iterator');
function GetP(O, P, Receiver) {
	// 8.3.7 [[GetP]] (P, Receiver) When the [[GetP]] internal method of O is called with property key P and ECMAScipt
	// language value Receiver the following steps are taken:

	// 1. Assert: P is a valid property key, either a String or a Symbol Object.
	if (typeof P != 'string' || getTagOf(P) != 'Symbol')
		throw new TypeError('String or symbol expected.');

	// 2. Let desc be the result of calling OrdinaryGetOwnProperty with arguments O and P.
	// 3. ReturnIfAbrupt(desc).
	var desc = getOwnPropertyDescriptor(O, P);

	var parent;

	// 4. If desc is undefined, then
	if (!desc) {

		// a. Let parent be the result of calling the [[GetInheritance]] internal method of O.
		// b. ReturnIfAbrupt(parent).
		parent = getPrototypeOf(O);

		// c. If parent is null, then return undefined.
		if (!parent)
			return undefined;

		// d. Return the result of calling the [[GetP]] internal methods of parent with arguments P and Receiver.
		return GetP(parent, P, Receiver);

	}

	// 5. If IsDataDescriptor(desc) is true, return desc.[[Value]].
	if (hasOwn(desc, 'value'))
		return desc.value;

	// 6. Otherwise, IsAccessorDescriptor(desc) must be true so, let getter be desc.[[Get]].
	var getter = desc.get;

	// 7. If getter is undefined, return undefined.
	if (!getter)
		return undefined;

	// 8. Return the result of calling the [[Call]] internal method of getter with targetThis as the thisArgument and an
	// empty List as argumentsList.
	// TODO: We assume "targetThis" is supposed to be "Receiver". Check with future versions of the draft.
	return call(getter, Receiver);

}

function SetP(O, P, V, Receiver) {
	// 8.3.8 [[SetP] (P, V, Receiver)
	// When the [[SetP]] internal method of O is called with property key P, value V, and ECMAScipt language value
	// Receiver, the following steps are taken:

	// 1. Assert: P is a valid property key, either a String or a Symbol Object.
	if (typeof P != 'string' || getTagOf(P) != 'Symbol')
		throw new TypeError('String or symbol expected.');

	// 2. Let ownDesc be the result of calling OrdinaryGetOwnProperty with arguments O and P.
	// 3. ReturnIfAbrupt(ownDesc).
	var ownDesc = getOwnPropertyDescriptor(O, P);

	var parent;

	// 4. If desc is undefined, then
	if (!ownDesc) {

		// a. Let parent be the result of calling the [[GetInheritance]] internal method of O.
		// b. ReturnIfAbrupt(parent).
		parent = getPrototypeOf(O);

		// c. If parent is not null, then
		if (parent)

			// i. Return the result of calling the [[SetP]] internal methods of parent with arguments P, V, and
			// Receiver.
			return SetP(parent, P, V, Receiver);

		// d. Else,
		else {

			// i. If Type(Receiver) is not Object, return false.
			if (Object(Receiver) !== Receiver)
				return false;

			// ii. Return the result of performing CreateOwnDataProperty(Receiver, P, V).
			// TODO: What should the values of writable, configurable, enumerable be?
			return defineProperty(Receiver, P, own({ value: V }));

		}

	}

	var valueDesc, setter, setterResult;

	// 5. If IsDataDescriptor(ownDesc) is true, then
	if (hasOwn(ownDesc, 'value')) {

		// a. If ownDesc.[[Writable]] is false, return false.
		if (!ownDesc.writable)
			return false;

		// b. If SameValue(O, Receiver) is true, then
		if (is(O, Receiver)) {

			// i. Let valueDesc be the Property Descriptor {[[Value]]: V}.
			valueDesc = own({ value: V });

			// ii. Return the result of calling OrdinaryDefineOwnProperty with arguments O, P, and valueDesc.
			return defineProperty(O, P, valueDesc);

		}

		// c. Else O and Receiver are different values,
		else {

			// i. If Type(Receiver) is not Object, return false.
			if (Object(Receiver) !== Object)
				return false;

			// ii. Return the result of performing CreateOwnDataProperty(Receiver, P, V).
			return defineProperty(Receiver, P, V);

		}

	}

	// 6. If IsAccessorDescriptor(desc) is true, then
	else {

		// a. Let setter be desc.[[Set]].
		setter = desc.set;

		// b. If setter is undefined, return false.
		if (!setter)
			return false;

		// c. Let setterResult be the result of calling the [[Call]] internal method of setter providing Receiver as
		// thisArgument and a new List containing V as argumentsList.
		// d. ReturnIfAbrupt(setterResult).
		setterResult = call(setter, Receiver, V);

		// e. Return true.
		return true;

	}

}

function ToPropertyKey(argument) {
	// 9.1.10 ToPropertyKey
	// The abstract operation ToPropertyKey converts its argument to a value that can be used as a property key by
	// performing the following steps:

	// 1. ReturnIfAbrupt(argument).
	// 2. If Type(argument) is Object, then
	if (Object(argument) === argument)

		// a. If argument is an exotic String object, then
		// TODO: Huh? What's an "exotic String object"?
		if (getTagOf(argument) == 'Symbol')

			// i. Return argument.
			return argument;

	// 3. Return ToString(argument).
	return String(argument);

}

function Enumerate(O) {

	// 1. Let obj be O.
	var obj = O;

	// 2. Let proto be the result of calling the [[GetInheritance]] internal method of O with no arguments.
	// 3. ReturnIfAbrupt(proto).
	var proto = getPrototypeOf(O);

	var propList;

	// 4. If proto is the value null, then
	if (!proto)

		// a. Let propList be a new empty List.
		propList = [ ];

	// 5. Else
	else

		// a. Let propList be the result of calling the [[Enumerate]] internal method of proto.
		propList = Enumerate(proto);

	// 6. ReturnIfAbrupt(propList).

	// 7. For each name that is the property key of an own property of O
	forEach(keys(O), function(name) {

		var desc, index;

		// a. If Type(name) is String, then
		if (typeof name == 'string') {

			// i. Let desc be the result of calling OrdinaryGetOwnProperty with arguments O and name.
			desc = getOwnPropertyDescriptor(O, name);

			// ii. If name is an element of propList, then remove name as an element of propList.
			if (~(index = indexOf(propList, name)))
				splice(propList, index, 1);

			// iii. If desc.[[Enumerable]] is true, then add name as an element of propList.
			if (hasOwn(desc, 'enumerable') && desc.enumerable)
				push(propList, name);

		}

	});

	// 8. Order the elements of propList in an implementation defined order.
	sort(propList);

	// 9. Return propList.
	return propList;

}
var Map = (function() {
	// TODO: It would probably be good to clean up deleted keys when possible. This is not a trivial task, however,
	// as cleanup can't break forEach and MapIterator, and it must update indices in object-keys and primitive-keys.

	var mNumber = 0,

		WeakMapGet = lazyBind(WeakMap.prototype.get),
		WeakMapSet = lazyBind(WeakMap.prototype.set),
		WeakMapClear = lazyBind(WeakMap.prototype.clear);

	function MapInitialisation(obj, iterable) {
		// 15.14.1.1 MapInitialisation

		// The abstract operation MapInitialisation with arguments obj and iterable is used to initialize an object
		// as a map. It performs the following steps:

		// 1. If Type(obj) is not Object, throw a TypeError exception.
		if (Object(obj) != obj)
			throw new TypeError('Object expected: ' + obj);

		var S = Secrets(obj);

		// [The following line is in line with step 3. Note that step 3 is still performed below because a secrets object
		// can be returned even if the object is not extensible.]
		if (!S) throw new TypeError('Object is not extensible.');

		// 2. If obj already has a [[MapData]] internal property, throw a TypeError exception.
		if (S.has('[[MapData]]'))
			throw new TypeError('Object is a Map.');

		// 3. If the [[Extensible]] internal property of obj is false, throw a TypeError exception.
		if (!isExtensible(obj))
			throw new TypeError('Object is not extensible.');

		var iterator, itr, adder;

		// 4. If iterable is not undefined, then
		if (iterable !== undefined) {

			// a. Let iterable be ToObject(iterable).
			// b. ReturnIfAbrupt(iterable)
			iterable = Object(iterable);

			// c. Let iterator be the intrinsic symbol @@iterator.
			// d. Let itr be the result of calling the Invoke abstraction operation with iterator, obj, and an empty
			// List as arguments.
			// e. ReturnIfAbrupt(itr).
			itr = call($$(obj, 'iterator'), obj);

			// f. Let adder be the result of calling the [[Get]] internal method of obj with argument "set".
			// g. ReturnIfAbrupt(adder).
			adder = obj.set;

			// h. If IsCallable(adder) is false, throw a TypeError Exception.
			if (typeof adder != 'function')
				throw new TypeError('Property "set" is not a function.');

		}

		// 5. Add a [[MapData]] internal property to obj.
		// 6. Set obj’s [[MapData]] internal property to a new empty List.
		S.set('[[MapData]]', create(null));
		S.set('#MapRecordId', 'Map:id:' + (mNumber++));
		// [Store size for efficiency.]
		S.set('Map:size', 0);
		// [Store indices by key for efficiency.]
		S.set('Map:primitive-keys', create(null));
		S.set('Map:object-keys', new WeakMap());

		// 7. If iterable is undefined, return obj.
		if (iterable === undefined) return obj;

		var next, k, v;

		// 8. Repeat
		while (true) {

			try {

				// a. Let next be the result of performing Invoke with arguments "next", itr, and an empty arguments
				// List.
				next = itr.next();

			} catch(x) {

				// b. If IteratorComplete(next) is true, then return NormalCompletion(obj).
				if (getTagOf(x) == 'StopIteration') return obj;
				else throw x;

			}

			// c. Let next be ToObject(next).
			// d. ReturnIfAbrupt(next).
			next = Object(next);

			// e. Let k be the result of calling the [[Get]] internal method of next with argument "0".
			// f. ReturnIfAbrupt(k).
			k = next[0];

			// g. Let v be the result of calling the [[Get]] internal method of next with argument "1".
			// h. ReturnIfAbrupt(v).
			v = next[1];

			// i. Let status be the result of calling the [[Call]] internal method of adder with obj as thisArgument
			// and a List whose elements are k and v as argumentsList.
			// j. ReturnIfAbrupt(status).
			call(adder, obj, k, v);

		}

	}

	function MapFunction(iterable) {
		// 15.14.2 The Map Constructor Called as a Function

		// When Map is called as a function rather than as a constructor, it initializes its this value with the
		// internal state necessary to support the Map.prototype internal methods. This premits super invocation of
		// the Map constructor by Map subclasses.

		// 15.14.2.1 Map (iterable = undefined )

		// 1. Let m be the this value.
		var m = this;

		var map;

		// 2. If m is undefined or the intrinsic %MapPrototype%
		if (m === undefined || m === Map.prototype)

			// a. Let map be the result of the abstract operation ObjectCreate (15.2) with the intrinsic
			// %WeakMapPrototype% as the argument.
			map = create(Map.prototype);

		// 3. Else
		else

			// a. Let map be the result of ToObject(m).
			map = Object(m);

		// 4. ReturnIfAbrupt(map).

		// 5. If iterable is not present, let iterable be undefined.

		// 6. Let status be the result of MapInitialisation with map and iterable as arguments.
		// 7. ReturnIfAbrupt(status).
		MapInitialisation(map, iterable);

		// 8. Return map.
		return map;

	}

	function MapConstructor(iterable) {
		// 15.14.3.1 new Map (iterable = undefined )

		// 1. Let map be the result of the abstract operation ObjectCreate (15.2) with the intrinsic %MapPrototype%
		// as the argument.
		var map = this;

		// 2. If iterable is not present, let iterable be undefined.

		// 3. Let status be the result of MapInitialisation with map and iterable as arguments.
		// 4. ReturnIfAbrupt(status).
		MapInitialisation(map, iterable);

		// 5. Return map.
		// [This step is automatic.]

	}

	function Map(/* iterable */) {

		var S, iterable = arguments[0];

		// [Map.prototype will always be the firstborn, since this property is non-configurable and non-writable.]
		if (this instanceof Map
			&& this != Map.prototype
			&& (S = Secrets(this))
			&& !S.has('Map:#constructed')
			) {

			call(MapConstructor, this, iterable);
			S.set('Map:#constructed', true);

		} else return call(MapFunction, this, iterable);

	}

	// 15.14.4.1 Map.prototype
	// The initial value of Map.prototype is the Map prototype object (15.14.4).
	// This property has the attributes { [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: false }.
	Object.defineProperty(Map, 'prototype', {
		value: Map.prototype,
		enumerable: false,
		writable: false,
		configurable: false
	});

	defineValuesWC(Map.prototype, {

		clear: function clear() {
			// 15.14.5.2 Map.prototype.clear()

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[MapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[MapData]]'))
				throw new TypeError('Object is not a Map.');

			// 4. Set the value of M’s [[MapData]] internal property to a new empty List.
			S.set('[[MapData]]', create(null));
			S.set('Map:size', 0);
			S.set('#MapRecordId', 'Map:id:' + (mNumber++));
			S.set('Map:primitive-keys', create(null));
			WeakMapClear(S.get('Map:object-keys'));

			// 5. Return undefined.

		},

		delete: function delete_(key) {
			// 15.14.5.3 Map.prototype.delete ( key )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[MapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[MapData]]'))
				throw new TypeError('Object is not a Map.');

			// 4. Let entries be the List that is the value of M’s [[MapData]] internal property.
			var entries = S.get('[[MapData]]');

			var p;

			// 5. Repeat for each Record {[[key]], [[value]]} p that is an element of entries,
			// for (var i = 0; i < entries.length; i++) {
			// [We deviate from the steps for efficiency; we can find most indices in O(1) rather than O(n).]
			var i = getRecordIndex(S, key);
			if (i !== false) {

				p = entries[i];

				// a. If SameValue(p.[[key]], key), then
				if (is(p.key, key)) {

					// i.   Set p.[[key]] to empty.
					delete p.key;

					// ii.  Set p.[[value]] to empty.
					delete p.value;

					// [Don't splice; it will break forEach.]
					S.set('Map:size', S.get('Map:size') - 1);

					// iii. Return true.
					return true;

				}

			}

			// 6. Return false.
			return false;

		},

		forEach: function forEach(callbackfn/*, thisArg = undefined */) {
			// 15.14.5.4 Map.prototype.forEach ( callbackfn , thisArg = undefined )

			// callbackfn should be a function that accepts three arguments. forEach calls callbackfn once for each
			// key/value pair present in the map object, in key insertion order. callbackfn is called only for keys of
			// the map which actually exist; it is not called for keys that have been deleted from the map.

			// If a thisArg parameter is provided, it will be used as the this value for each invocation of callbackfn.
			// If it is not provided, undefined is used instead.

			// NOTE If callbackfn is an Arrow Function, this was lexically bound when the function was created so
			// thisArg will have no effect.

			// callbackfn is called with three arguments: the value of the item, the key of the item, and the Map object
			// being traversed.

			// forEach does not directly mutate the object on which it is called but the object may be mutated by the
			// calls to callbackfn.

			// NOTE Each key is visited only once with the value that is current at the time of the visit. If the value
			// associated with a key is modified after it has been visited, it is not re-visited. Keys that are deleted
			// after the call to forEach begins and before being visited are not visited. New keys added, after the call
			// to forEach begins are visited.

			var thisArg = arguments[1];

			// When the forEach method is called with one or two arguments, the following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[MapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[MapData]]'))
				throw new TypeError('Object is not a Map.');

			// 4. If IsCallable(callbackfn) is false, throw a TypeError exception.
			if (typeof callbackfn != 'function')
				throw new TypeError('Function expected in call to forEach.');

			// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
			var T = thisArg;

			// 6. Let entries be the List that is the value of M’s [[MapData]] internal property.
			var entries = S.get('[[MapData]]');

			var e, funcResult;

			// 7. Repeat for each Record {[[key]], [[value]]} e that is an element of entries,in original key insertion
			// order
			for (var i = 0; i < entries.length; i++) {
				e = entries[i];

				// a. If e.[[key]] is not empty, then
				if ('key' in e) {

					// i. Let funcResult be the result of calling the [[Call]] internal method of callbackfn with T as
					// thisArgument and a List containing e.[[value]], e.[[key]], and M as argumentsList.
					// ii. ReturnIfAbrupt(funcResult).
					funcResult = call(callbackfn, T, e.value, e.key, M);

				}

			}

			// 8. Return undefined.

			// The length property of the forEach method is 1.

		},

		get: function get(key) {
			// 15.14.5.5 Map.prototype.get ( key )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value the as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[MapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[MapData]]'))
				throw new TypeError('Object is not a Map.');

			// 4. Let entries be the List that is the value of M’s [[MapData]] internal property.
			var entries = S.get('[[MapData]]');

			var p;

			// 5. Repeat for each Record {[[key]], [[value]]} p that is an element of entries,
			// for (var i = 0; i < entries.length; i++) {
			// [We deviate from the steps for efficiency; we can find most indices in O(1) rather than O(n).]
			var i = getRecordIndex(S, key);
			if (i !== false) {

				p = entries[i];

				// a. If SameValue(p.[[key]], key), then return p.[[value]]
				if (is(p.key, key))
					return p.value;

			}

			// 6. Return undefined.

		},

		has: function has(key) {
			// 15.14.5.6 Map.prototype.get ( key )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value the as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[MapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[MapData]]'))
				throw new TypeError('Object is not a Map.');

			// 4. Let entries be the List that is the value of M’s [[MapData]] internal property.
			var entries = S.get('[[MapData]]');

			var p;

			// 5. Repeat for each Record {[[key]], [[value]]} p that is an element of entries,
			// for (var i = 0; i < entries.length; i++) {
			// [We deviate from the steps for efficiency; we can find most indices in O(1) rather than O(n).]
			var i = getRecordIndex(S, key);
			if (i !== false) {

				p = entries[i];

				// a. If SameValue(p.[[key]], key), then return true.
				if (is(p.key, key))
					return true;

			}

			// 6. Return false.
			return false;

		},

		items: function items() {
			// 15.14.5.7 Map.prototype.items ( )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			// 3. Return the result of calling the CreateMapIterator abstract operation with arguments M and
			// "key+value".
			// TODO: CreateMapIterator
			return CreateMapIterator(M, 'key+value');

		},

		keys: function keys() {
			// 15.14.5.8 Map.prototype.keys ( )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			// 3. Return the result of calling the CreateMapIterator abstract operation with arguments M and "key".
			return CreateMapIterator(M, 'key');

		},

		set: function set(key, value) {
			// 15.14.5.9 Map.prototype.set ( key , value )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(this);

			// 3. If M does not have a [[MapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[MapData]]'))
				throw new TypeError('Object is not a Map.');

			// 4. Let entries be the List that is the value of M’s [[MapData]] internal property.
			var entries = S.get('[[MapData]]');

			var p;

			// 5. Repeat for each Record {[[key]], [[value]]} p that is an element of entries,
			// for (var i = 0; i < entries.length; i++) {
			// [We deviate from the steps for efficiency; we can find most indices in O(1) rather than O(n).]
			var i = getRecordIndex(S, key);
			if (i !== false) {

				p = entries[i];

				// a. If SameValue(p.[[key]], key), then
				if (is(p.key, key)) {

					// i.  Set p.[[value]] to value.
					p.value = value;

					// ii. Return undefined.
					return;

				}

			}

			// 6. Let p be the Record {[[key]]: key, [[value]]: value}
			p = create(null);
			p.key = key;
			p.value = value;

			// 7. Append p as the last element of entries.
			push(entries, p);
			S.set('Map:size', S.get('Map:size') + 1);

			// [We store the index in a WeakMap or hash map for efficiency.]
			var index = entries.length - 1;
			if (Object(key) === key)
				WeakMapSet(S.get('Map:object-keys'), key, index);
			else
				S.get('Map:primitive-keys')[convertPrimitive(key)] = index;

			// 8. Return undefined.

		},

		get size() {
			// 15.14.5.10 get Map.prototype.size

			// Map.prototype.size is an accessor property whose set accessor function is undefined. Its get accessor
			// function performs the following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			var S = Secrets(M);

			// 3. If M does not have a [[MapData]] internal property throw a TypeError exception.
			if (!S || !S.has('[[MapData]]'))
				throw new TypeError('Object is not a Map.');

			// [From here on we take a much more efficient approach than the steps, using a stored size.]
			return S.get('Map:size');

			// 4. Let entries be the List that is the value of M’s [[MapData]] internal property.
			// 5. Let count be 0.
			// 6. For each Record {[[key]], [[value]]} p that is an element of entries
				// a. If p.[[key]] is not empty then
					// i. Set count to count+1.
			// 7. Return count.

		},

		values: function values() {
			// 15.14.5.11 Map.prototype.values ( )

			// The following steps are taken:

			// 1. Let M be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(M).
			var M = Object(this);

			// 3. Return the result of calling the CreateMapIterator abstract operation with arguments M and "value".
			return CreateMapIterator(M, 'value');

		}

	});

	$$(Map.prototype, 'iterator', Map.prototype.items);

	// 15.14.5.7 Map.prototype.@@toStringTag
	// The initial value of the @@toStringTag property is the string value "Map".
	$$(Map.prototype, 'toStringTag', 'Map');

	// 15.14.7 Map Iterator Object Structure

	// A Map Iterator is an object, with the structure defined below, that represent a specific iteration over some
	// // specific Map instance object. There is not a named constructor for Map Iterator objects. Instead, map iterator
	// objects are created by calling certain methods of Map instance objects.

	function CreateMapIterator(map, kind) {
		// 15.14.7.1 CreateMapIterator Abstract Operation

		// Several methods of Map objects return interator objects. The abstract operation CreateMapIterator with
		// arguments map and kind is used to create and such iterator objects. It performs the following steps:

		// 1. Let M be the result of calling ToObject(map).
		// 2. ReturnIfAbrupt(M).
		var M = Object(map);

		var S = Secrets(M);

		// 3. If M does not have a [[MapData]] internal property throw a TypeError exception.
		if (!S || !S.has('[[MapData]]'))
			throw new TypeError('Object is not a Map.');

		// 4. Let entries be the List that is the value of M’s [[MapData]] internal property.
		// TODO: entries is defined but never used.
		var entries = S.get('[[MapData]]');

		// 5. Let itr be the result of the abstract operation ObjectCreate with the intrinsic object
		// %MapIteratorPrototype% as its argument.
		var itr = create(MapIteratorPrototype);

		var Si = Secrets(itr);

		// 6. Add a [[Map]] internal property to itr with value M.
		Si.set('[[Map]]', M);

		// 7. Add a [[MapNextIndex]] internal property to itr with value 0.
		Si.set('[[MapNextIndex]]', 0);

		// 8. Add a [[MapIterationKind]] internal property of itr with value kind.
		Si.set('[[MapIterationKind]]', kind);

		// 9. Return itr.
		return itr;

	}

	// 5.14.7.2 The Map Iterator Prototype

	// All Map Iterator Objects inherit properties from a common Map Iterator Prototype object. The [[Prototype]]
	// internal property of the Map Iterator Prototype is the %ObjectPrototype% intrinsic object. In addition, the Map
	// Iterator Prototype as the following properties:

	var MapIteratorPrototype = { };

	defineValuesWC(MapIteratorPrototype, {

		next: function() {
			// 15.14.7.2.2 MapIterator.prototype.next( )

			// 1. Let O be the this value.
			var O = this;

			// 2. If Type(O) is not Object, throw a TypeError exception.
			if (Object(O) != O)
				throw new TypeError('Object expected.');

			var S = Secrets(O);

			// 3. If O does not have all of the internal properties of a Map Iterator Instance (15.14.7.1.2), throw a
			// TypeError exception.
			if (!S || !S.has('[[Map]]') || !S.has('[[MapNextIndex]]') || !S.has('[[MapIterationKind]]'))
				throw new TypeError('MapIterator expected.');

			// 4. Let m be the value of the [[Map]] internal property of O.
			var m = S.get('[[Map]]');

			// 5. Let index be the value of the [[MapNextIndex]] internal property of O.
			var index = S.get('[[MapNextIndex]]');

			// 6. Let itemKind be the value of the [[MapIterationKind]] internal property of O.
			var itemKind = S.get('[[MapIterationKind]]');

			var Sm = Secrets(m);

			// 7. Assert: m has a [[MapData]] internal property.
			if (!Sm || !Sm.has('[[MapData]]'))
				throw new TypeError('Map expected.');

			// 8. Let entries be the List that is the value of the [[MapData]] internal property of m.
			var entries = Sm.get('[[MapData]]');

			var e, result;

			// 9. Repeat while index is less than the total number of element of entries. The number of elements must be
			// redetermined each time this method is evaluated.
			while (index < entries.length) {

				// a. Let e be the Record {[[key]], [[value]]} at 0-origined insertion position index of entries.
				e = entries[index];

				// b. Set index to index+1;
				index++;

				// c. Set the [[MapNextIndex]] internal property of O to index.
				S.set('[[MapNextIndex]]', index);

				// d. If e.[[key]] is not empty, then
				if ('key' in e) {

					// i. If itemKind is "key" then, let result be e.[[key]].
					if (itemKind == 'key')
						result = e.key;

					// ii. Else if itemKind is "value" then, let result be e.[[value]].
					else if (itemKind == 'value')
						result = e.value;

					// iii. Else,
					else {

						// 1. Assert: itemKind is "key+value".
						if (itemKind != 'key+value')
							throw new Error('Invalid item kind: ' + itemKind);

						// 2. Let result be the result of the abstract operation ArrayCreate with argument 2.
						result = new Array(2);

						// 3. Assert: result is a new, well-formed Array object so the following operations will never
						// fail.

						// 4. Call the [[DefineOwnProperty]] internal method of result with arguments "0", Property
						// Descriptor {[[Value]]: e.[[key]], [[Writable]]: true, [[Enumerable]]: true,
						// [[Configurable]]: true}, and false.
						result[0] = e.key;

						// 5. Call the [[DefineOwnProperty]] internal method of result with arguments "1", Property
						// Descriptor {[[Value]]: e.[[value]], [[Writable]]: true, [[Enumerable]]: true,
						// [[Configurable]]: true}, and false.
						result[1] = e.value;

					}

					// iv. Return result.
					return result;

				}

			}

			// 10. Return Completion {[[type]]: throw, [[value]]: %StopIteration%, [[target]]: empty}.
			throw StopIteration;

		}


	});


	$$(MapIteratorPrototype, 'iterator', function $$iterator() {
		// 	15.14.7.2.3MapIterator.prototype.@@iterator ( )
		// The following steps are taken:

		// 1. Return the this value.
		return this;

	});

	// 15.14.7.2.4MapIterator.prototype.@@toStringTag
	// The initial value of the @@toStringTag property is the string value "Map Iterator".
	$$(MapIteratorPrototype, 'toStringTag', 'Map Iterator');

	function getRecordIndex(S, k) {

		var index;

		if (Object(k) === k)
			index = WeakMapGet(S.get('Map:object-keys'), k);
		else
			index = S.get('Map:primitive-keys')[convertPrimitive(k)];

		if (index === undefined) return false;
		return index;

	}

	function convertPrimitive(k) {
		switch(typeof k) {
			case 'object': return 'null'; // should only be null
			case 'undefined': return 'undefined';
			case 'boolean': return String(k);
			case 'number': return String(k);
			case 'string': return '"' + k + '"';
			default: throw new TypeError('Key type unexpected: ' + typeof k);
		}
	}

	return Map;

})();
(function() {

	var log = Math.log,
		pow = Math.pow;

	shimProps(Math, {

		log10: getLogFunction(10),
		log2: getLogFunction(2),

		log1p: function(x) {

			// Returns an implementation-dependent approximation to the natural logarithm of 1 + x.
			// The result is computed in a way that is accurate even when the value of x is close to zero.
			var value = 0,
				precision = 256,

				number = Number(x);

			// If x is NaN, the result is NaN.
			if (isNaN(number)) return NaN;

			// If x is less than 0, the result is NaN.
			if (number < -1) return NaN;

			// If x is +0, the result is −Infinity.
			// If x is −0, the result is −Infinity.
			if (number == -1) return -Infinity;

			// If x is 1, the result is +0.
			if (number == 0) return 0;

			// If x is +Infinity, the result is +Infinity.
			if (x == Infinity) return Infinity;

			if (number <= 0 || number >= 1e-5) return log(1 + number);

			for (var i = 1; i < precision; i++)
				if ((i % 2) === 0)
					value += (i % 2 == 0 ? -1 : 1) * pow(number, i) / i;

			return value;

		},

		expm1: function(x) {
			// TODO
		},
		// TODO: Several functions: 15.8.23+

		trunc: function trunc(x) {

			// Returns the integral part of the number x, removing any fractional digits. If x is already an integer,
			// the result is x.

			var number = Number(x);

			// If x is NaN, the result is NaN.
			if (isNaN(number)) return NaN;

			// If x is -0, the result is -0.
			// If x is +0, the result is +0.
			if (number == 0) return number;

			// If x is +Infinity, the result is +Infinity.
			if (number == Infinity) return Infinity;

			// If x is -Infinity, the result is -Infinity.
			if (number == -Infinity) return -Infinity;

			return NumberToInt(number);

		},

		sign: function sign(x) {

			// Returns the sign of the x, indicating whether x is positive, negative or zero.

			var number = Number(x);

			// If x is NaN, the result is NaN.
			if (isNaN(number)) return NaN;

			// If x is -0, the result is -0.
			// If x is +0, the result is +0.
			if (number == 0) return number;

			// If x is negative and not -0, the result is -1.
			if (number < 0) return -1;

			// If x is positive and not +0, the result is +1.
			if (number > 0) return 1;

		},

		cbrt: function cbrt(x) {

			// Returns an implementation-dependent approximation to the cube root of x.

			var number = Number(x);

			// If x is NaN, the result is NaN.
			if (isNaN(number)) return NaN;

			// If x is +0, the result is +0.
			// If x is -0, the result is -0.
			if (number == 0) return number;

			// If x is +Infinity, the result is +Infinity.
			if (number == Infinity) return Infinity;

			// If x is -Infinity, the result is -Infinity.
			if (number == -Infinity) return -Infinity;

			return pow(number, 1 / 3);

		}


	});

	function getLogFunction(base) {
		return function logB(x) {

			// Returns an implementation-dependent approximation to the specified base logarithm of x.

			var number = Number(x);

			// If x is NaN, the result is NaN.
			if (NumberIsNaN(number)) return NaN;

			// If x is less than 0, the result is NaN.
			if (number < 0) return NaN;

			// If x is +0, the result is −Infinity.
			// If x is −0, the result is −Infinity.
			if (number == 0) return -Infinity;

			// If x is 1, the result is +0.
			if (number == 1) return 0;

			// If x is +Infinity, the result is +Infinity.
			if (x == Infinity) return Infinity;

			return log(x) / log(base);

		};
	}

})();
function NumberIsNaN(number) {

	// 1. If Type(number) is not Number, return false.
	if (typeof number != 'number') return false;

	// 2. If number is NaN, return true.
	if (is(number, NaN)) return true;

	// 3. Otherwise, return false.
	return false;

};

function NumberIsFinite(number) {
	// 15.7.3.12
	// This is different from the global isFinite.

	// 1. If Type(number) is not Number, return false.
	if (typeof number != 'number') return false;

	// 2. If number is NaN, +Infinity, or -Infinity, return false.
	if (NumberIsNaN(number) || number == Infinity || number == -Infinity) return false;

	// 3. Otherwise, return true.
	return true;

};

function NumberIsInteger(number) {

	// 1. If Type(number) is not Number, return false.
	if (typeof number != 'number') return false;

	// 2. Let integer be ToInteger(number).
	var integer = NumberToInt(number);

	// 3. If integer is not equal to number, return false.
	if (integer != number) return false;

	// 4. Otherwise, return true.
	return true;

};

function NumberToInt(value) {
	// ECMA-262 Ed. 6, 9-27-12. 9.1.4

	// 1. Let number be the result of calling ToNumber on the input argument.
	// 2. ReturnIfAbrupt(number).
	var number = Number(value);

	// 3. If number is NaN, return +0.
	if (NumberIsNaN(number)) return 0;

	// 4. If number is +0, -0, +Infinity, or -Infinity, return number.
	if (number == 0 || number == Infinity || number == -Infinity) return number;

	// 5. Return the result of computing sign(number) * floor(abs(number)).
	return (number < 0 ? -1 : 1) * floor(abs(number));

};

shimProps(Number, {
	isNaN: NumberIsNaN,
	isFinite: NumberIsFinite,
	isInteger: NumberIsInteger,
	toInt: NumberToInt
});

shimProps(Number, {

	// The following properties have the attributes
	// { [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: false }.
	enumerable: false,
	writable: false,
	configurable: false

}, {

	// The value of Number.EPSILON is the difference between 1 and the smallest value greater than 1 that is
	// representable as a Number value, which is approximately 2.2204460492503130808472633361816 * 10 ^ -16.
	EPSILON: 2.2204460492503130808472633361816e-16,

	// The value of Number.MAX_INTEGER is the largest integer value that can be represented as a Number value
	// without losing precision, which is 9007199254740991.
	MAX_INTEGER: 9007199254740991

});

shimProps(Number.prototype, {

	clz: function clz() {
		// TODO: Performance could probably be improved.
		// clz: Count Leading Zeros

		// 1. Let x be this Number value.
		var x = Number(this);

		// 2. Let n be ToUint32(x).
		// 3. ReturnIfAbrupt(n).
		var n = x >>> 0;

		// 4. Let p be the number of leading zero bits in the 32-bit binary representation of n.
		// 5. Return p.
		for (var p = 32; p > 0; p--) {
			if (n == 0) return p;
			n = n >>> 1;
		}
		return 0;

	}

});
// TODO: Object.prototype.assign if possible.

(function() {

	shimProps(Object, {

		getPropertyNames: function getPropertyNames(obj) {

			if (Object(obj) !== obj)
				throw new Error('Object.getPropertyNames called on non-object: ' + obj);

			var names = [ ];

			do {
				names = concat(names, getOwnPropertyNames(obj));
			} while (obj = getPrototypeOf(obj));

			return names;

		},

		getPropertyDescriptor: function getPropertyDescriptor(obj, name) {

			if (Object(obj) !== obj)
				throw new Error('Object.getPropertyDescriptor called on non-object: ' + obj);

			var desc;

			do {
				desc = getOwnPropertyDescriptor(obj, name);
			} while (!desc && (obj = getPrototypeOf(obj)));

			return desc;

		},

		is: function is(a, b) {
			// egal function. Exposes ES5 SameValue function.
			return a === b && (a !== 0 || 1 / a === 1 / b) // false for +0 vs -0
				|| a !== a && b !== b; // true for NaN vs NaN
		}

	});

})();

Object.prototype.toString = (function() {

	var original = lazyBind(Object.prototype.toString),
		nativeBrands = { };

	[
		"Arguments", "Array", "Boolean", "Date", "Error", "Function", "JSON", "Math", "Number", "Object", "RegExp",
		"String"
	].forEach(function(u) {
		nativeBrands[u] = true;
	});

	return function toString() {

		// 15.2.4.2 Object.prototype.toString ( )

		// When the toString method is called, the following steps are taken:

		// 1. If the this value is undefined, return "[object Undefined]".
		if (this === undefined) return '[object Undefined]';

		// 2. If the this value is null, return "[object Null]".
		if (this === null) return '[object Null]';

		// 3. Let O be the result of calling ToObject passing the this value as the argument.
		var O = Object(this);

		// 4. If O has a [[NativeBrand]] internal property, let tag be the corresponding value from
		// 5. Table 27.
		// [[[NativeBrand]] corresponds loosely to ES5 [[Class]]].
		var NativeBrand = StringSlice(original(O), 8, -1);
		if (nativeBrands[NativeBrand] && NativeBrand != 'Object')
			return '[object ' + NativeBrand + ']';

		// 6. Else
		else {

			// a. Let hasTag be the result of calling the [[HasProperty]] internal method of O with argument
			// @@toStringTag.
			var hasTag;
			try { hasTag = $$($$HAS, O, 'toStringTag'); }
			catch(x) { }

			// b. If hasTag is false, let tag be "Object".
			// [We use NativeBrand here instead of Object to defer to the built-in toString, which may be an ES6-
			// compliant toString. This allows us to extend toString to support $$toStringTag without possibly
			// breaking an existing support for @@toStringTag. In ES5 accessing [[Class]] through toString and
			// accessing @@toStringTag on an extended object are functionally equivalent, so this shouldn't produce
			// any discernible differences in ES5 and ES6 environments.]
			if (!hasTag) tag = NativeBrand;

			// c. Else,
			else {

				var tag;

				try {

					// i. Let tag be the result of calling the [[Get]] internal method of O with argument @@toStringTag.
					// Note: This $$(...) shouldn't need a try/catch since it should have already thrown above
					// and not taken this `else` route if the object can't hold secrets.
					tag = $$(O, 'toStringTag');

				} catch(x) {

					// ii. If tag is an abrupt completion, let tag be NormalCompletion("???").
					tag = '???';

				}

				// iii. Let tag be tag.[[value]].

				// iv. If Type(tag) is not String, let tag be "???".
				if (typeof tag != 'string')
					tag = '???';

				// v. If tag is any of "Arguments", "Array", "Boolean", "Date", "Error", "Function", "JSON", "Math",
				// "Number", "Object", "RegExp", or "String" then let tag be the string value "~" concatenated with the
				// current value of tag.
				if (nativeBrands[tag])
					tag = '~' + tag;

			}

		}

		// 7. Return the String value that is the result of concatenating the three Strings "[object ", tag, and "]".
		return '[object ' + tag + ']';

	};

})();
var ReflectHas;

var Reflect = (function() {

	return {

		getPrototypeOf: Object.getPrototypeOf,

		// Note: We cannot implement setPrototypeOf .. at least without a significant overhead.

		isExtensible: Object.isExtensible,
		preventExtensions: Object.preventExtensions,
		hasOwn: lazyBind(Object.prototype.hasOwnProperty),
		getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,

		get: function get(target, propertyKey/*, receiver = target */) {

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Let key be ToPropertyKey(propertyKey).
			// 4. ReturnIfAbrupt(key).
			var key = ToPropertyKey(propertyKey);

			// 5. If receiver is not present, then
			var receiver = arguments.length < 3 ? arguments[2]
				// a. Let receiver be target.
				: target;

			// 6. Return the result of calling the [[GetP]] internal method of obj with arguments key, and receiver.
			return GetP(obj, key, receiver);

		},

		set: function set(target, propertyKey, V/* receiver = target */) {

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Let key be ToPropertyKey(propertyKey).
			// 4. ReturnIfAbrupt(key).
			var key = ToPropertyKey(propertyKey);

			// 5. If receiver is not present, then
			var receiver = arguments.length < 3 ? arguments[2]
				// a. Let receiver be target.
				: target;

			// 6. Return the result of calling the [[SetP]] internal method of obj with arguments key, V, and receiver.
			return SetP(obj, key, V, receiver);

		},

		deleteProperty: function deleteProperty(target, propertyKey) {
			// 15.17.1.9 Reflect.deleteProperty (target, propertyKey)
			// When the deleteProperty function is called with arguments target and propertyKey, the following steps are
			// taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Let key be ToPropertyKey(propertyKey).
			// 4. ReturnIfAbrupt(key).
			var key = ToPropertyKey(propertyKey);

			// 5. Return the result of calling the [[Delete]] internal method of obj with argument key.
			delete obj[key];

		},

		defineProperty: function defineProperty(target, propertyKey, Attributes) {
			// 15.17.1.10 Reflect.defineProperty(target, propertyKey, Attributes)
			// When the defineProperty function is called with arguments target, propertyKey, and Attributes the
			// following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Let key be ToPropertyKey(propertyKey).
			// 4. ReturnIfAbrupt(key).
			var key = ToPropertyKey(propertyKey);

			// 5. Let desc be the result of calling ToPropertyDescriptor with Attributes as the argument.
			// 6. ReturnIfAbrupt(desc).

			// 7. Return the result of calling the [[DefineOwnProperty]] internal method of obj with arguments key, and
			// desc.
			defineProperty(obj, key, Attributes)

		},

		enumerate: function enumerate(target) {
			// 15.17.1.11 Reflect.enumerate (target)
			// When the enumerate function is called with argument target the following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Let itr be the result of calling the [[Enumerate]] internal method of obj.
			var itr = Enumerate(obj);

			// 4. Return itr.
			return itr;

		},

		keys: function keys(target) {
			// 15.17.1.12 Reflect.keys (target)
			// When the keys function is called with argument target the following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Let keys be the result of calling the [[Keys]] internal method of obj.
			// 4. ReturnIfAbrupt(keys).
			var keys = keys(obj);

			// 5. Return CreateArrayFromList(keys).
			return keys;

		},

		getOwnPropertyNames: function getOwnPropertyNames(target) {
			// 15.17.1.13 Reflect.getOwnPropertyNames (target)
			// When the getOwnPropertyNames function is called with argument target the following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Let keys be the result of calling the [[OwnPropertyKeys]] internal method of obj.
			// 4. ReturnIfAbrupt(keys).
			var keys = getOwnPropertyNames(obj);

			// 5. Return CreateArrayFromList(keys).
			return keys;

		},

		freeze: function freeze(target) {
			// 15.17.1.14 Reflect.freeze (target)
			// When the freeze function is called with argument target the following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Return the result of calling the [[Freeze]] internal method of obj.
			return freeze(obj);

		},

		seal: function seal(target) {
			// 15.17.1.15 Reflect.seal (target)
			// When the seal function is called with argument target the following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Return the result of calling the [[Freeze]] internal method of obj.
			// Note: surely [[Seal]] was intended.
			return seal(obj);

		},

		isFrozen: function isFrozen(target) {
			// 15.17.1.16 Reflect.isFrozen (target)
			// When the isFrozen function is called with argument target the following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Return the result of calling the [[IsFrozen]] internal method of obj.
			return isFrozen(obj);

		},

		isSealed: function isSealed(target) {
			// 15.17.1.17 Reflect.isSealed (target)
			// When the isSealed function is called with argument target the following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Return the result of calling the [[IsSealed]] internal method of obj.
			return isSealed(obj);

		},

		has: ReflectHas = function has(target, propertyKey) {
			// 15.17.2.1 Reflect.has (target, propertyKey)
			// When the has function is called with arguments target and propertyKey, the following steps are taken:

			// 1. Let obj be ToObject(target).
			// 2. ReturnIfAbrupt(obj).
			var obj = Object(target);

			// 3. Let key be ToPropertyKey(propertyKey).
			// 4. ReturnIfAbrupt(key).
			var key = ToPropertyKey(propertyKey);

			// 5. Return the result of HasProperty( obj, key).
			return key in obj;

		},

		instanceOf: function instanceOf(target, O) {
			// 15.17.2.1 Reflect.instanceOf (target, O)
			// When the instanceOf function is called with arguments target and O, the following steps are taken:

			// 1. Return the result of OrdinaryInstanceOf(target, O).
			return target instanceof O;

		}

	};

})();
var Set = (function() {

	var MapHas = lazyBind(Map.prototype.has),
		MapSet = lazyBind(Map.prototype.set),
		MapDelete = lazyBind(Map.prototype.delete),
		MapForEach = lazyBind(Map.prototype.forEach),
		MapSize = lazyBind(getOwnPropertyDescriptor(Map.prototype, 'size').get),
		MapKeys = lazyBind(Map.prototype.keys),
		MapIteratorNext = lazyBind(getPrototypeOf(new Map().values()).next);

	// 15.16.1 Abstract Operations For Set Objects

	function SetInitialisation(obj, iterable) {
		// 15.16.1.1 SetInitialisation

		// The abstract operation SetInitialisation with arguments obj and iterable is used to initialize an object as a
		// set instance. It performs the following steps:

		// [Step numbers are [sic].]
		// 3. If Type(obj) is not Object, throw a TypeError exception.
		if (Object(obj) !== obj)
			throw new TypeError('Object expected: ' + obj);

		var S = Secrets(obj);

		// [The following line is in line with step 5. Note that step 5 is still performed below because a secrets object
		// can be returned even if the object is not extensible.]
		if (!S) throw new TypeError('Object is not extensible.');

		// 4. If obj already has a [[SetData]] internal property, throw a TypeError exception.
		if (S.has('[[SetData]]'))
			throw new TypeError('Object is a Set.');

		// 5. If the [[Extensible]] internal property of obj is false, throw a TypeError exception.
		if (!Object.isExtensible(obj))
			throw new TypeError('Object is not extensible.');

		var hasValues, iterator, itr, adder;

		// 6. If iterable is not undefined, then
		if (iterable !== undefined) {

			// a. Let iterable be ToObject(iterable).
			// b. ReturnIfAbrupt(iterable)
			iterable = Object(iterable);

			// c. Let hasValues be the result of calling the [[HasProperty]] internal method of iterable with argument
			// "values"
			hasValues = 'values' in iterable;

			// d. If hasValues is true, then
			if (hasValues)

				// i. Let itr be the result of calling the Invoke abstraction operation with "values", obj, and an empty
				// List as arguments.
				// TODO: I think the draft is wrong. It should say "iterable" instead of "obj". Confirm this.
				itr = iterable.values();

			// e. Else,
			else {

				// i. Let iterator be the @@iterator symbol.
				// ii. Let itr be the result of calling the Invoke abstraction operation with iterator, obj, and an
				// empty List as arguments.
				// TODO: I think the draft is wrong. It should say "iterable" instead of "obj". Confirm this.
				itr = call($$(iterable, 'iterator'), iterable);

			}

			// f. ReturnIfAbrupt(itr).

			// g. Let adder be the result of calling the [[Get]] internal method of obj with argument "add".
			// h. ReturnIfAbrupt(adder).
			adder = obj.add;

			// i. If IsCallable(adder) is false, throw a TypeError Exception.
			if (typeof adder != 'function')
				throw new TypeError('Property "add" is not a function.');

		}

		// 7. Add a [[SetData]] internal property to obj.
		// 8. Set obj’s [[SetData]] internal property to a new empty List.
		// [We can make things more efficient by using a Map.]
		S.set('[[SetData]]', new Map());

		// 9. If iterable is undefined, return obj.
		if (iterable === undefined)
			return obj;

		var next;

		// 10. Repeat
		while (true) {

			try {
				// a. Let next be the result of performing Invoke with arguments "next", itr, and an empty arguments List.
				next = itr.next();
			} catch(x) {
				// b. If IteratorComplete(next) is true, then return NormalCompletion(obj).
				if (getTagOf(x) == 'StopIteration') return obj;
				else throw x;
			}

			// c. Let next be ToObject(next).
			// d. ReturnIfAbrupt(next).
			// TODO: This seems wrong. Why convert to object? check with ES Discuss. I'm commenting it out for now.
			// next = Object(next);

			// e. Let status be the result of calling the [[Call]] internal method of adder with obj as thisArgument and
			// a List whose sole element is v as argumentsList.
			// f. ReturnIfAbrupt(status).
			call(adder, obj, next);

		}

	}

	function SetFunction(iterable) {
		// 15.16.2 The Set Constructor Called as a Function
		// When Set is called as a function rather than as a constructor, it initializes its this value with the
		// internal state necessary to support the Set.prototype internal methods. This permits super invocation of the
		// Set constructor by Set subclasses.

		// 15.16.2.1 Set (iterable = undefined )

		// 1. Let O be the this value.
		var O = this;

		var set;

		// 2. If O is undefined or the intrinsic %SetPrototype%
		if (O === undefined || O === Set.prototype)

			// a. Let set be the result of the abstract operation ObjectCreate (15.2) with the intrinsic %SetPrototype%
			// as the argument.
			set = create(Set.prototype);

		// 3. Else
		else

			// a. Let set be the result of ToObject(O).
			set = Object(O);

		// 4. ReturnIfAbrupt(map).

		// 5. If iterable is not present, let iterable be undefined.

		// 6. Let status be the result of SetInitialisation with set and iterable as arguments.
		// 7. ReturnIfAbrupt(status).
		SetInitialisation(set, iterable);

		// 8. Return set.
		return set;

		// NOTE If the parameter iterable is present, it is expected to be an object that implements an @@iterator
		// method that returns an iterator object that produces two element array-like objects whose first element is a
		// value that will be used as an Map key and whose second element is the value to associate with that key.

	}

	function SetConstructor(iterable) {
		// 15.16.3 The Set Constructor
		// When Set is called as part of a new expression it is a constructor: it initialises the newly created object.

		// 15.16.3.1 new Set (iterable = undefined )

		// 1. Let set be the result of the abstract operation ObjectCreate (15.2) with the intrinsic %SetPrototype% as
		// the argument.
		var set = this;

		// 2. If iterable is not present, let iterable be undefined.

		// 3. Let status be the result of SetInitialisation with set and iterable as arguments.
		// 4. ReturnIfAbrupt(status).
		SetInitialisation(set, iterable);

		// 5. Return set.
		return set;

		// NOTE If the parameter iterable is present, it is expected to be an object that implements either a values
		// method or an @@iterator method. Either method is expected to return an interator object that returns the
		// values that will be the initial elements of the set.

	}

	function Set(/* iterable */) {

		var S, iterable = arguments[0];

		// [WeakMap.prototype will always be the firstborn, since this property is non-configurable and non-writable.]
		if (this instanceof Set
			&& this != Set.prototype
			&& (S = Secrets(this))
			&& !S.has('Set:#constructed')
			) {

			call(SetConstructor, this, iterable);
			S.set('Set:#constructed', true);

		} else return call(SetFunction, this, iterable);

	}

	// 15.16.4	Properties of the Set Constructor
	// The value of the [[Prototype]] internal property of the Set constructor is the Function prototype object (15.3.4).
	// Besides the internal properties and the length property (whose value is 0), the Set constructor has the following
	// property:

	// 15.16.4.1 Set.prototype
	// The initial value of Set.prototype is the intrinsic %SetPrototype% object (15.16.4).
	// This property has the attributes { [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: false }.
	Object.defineProperty(Set, 'prototype', {
		value: Set.prototype,
		enumerable: false,
		writable: false,
		configurable: false
	});

	defineValuesWC(Set.prototype, {

		add: function add(value) {
			// 15.16.5.2 Set.prototype.add (value)
			// The following steps are taken:

			// 1. Let S be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(S).
			var S = Object(this);

			var $ = Secrets(S);

			// 3. If S does not have a [[SetData]] internal property throw a TypeError exception.
			if (!$ || !$.has('[[SetData]]'))
				throw new TypeError('Object is not a Set.');

			// 4. Let entries be the List that is the value of S’s [[SetData]] internal property.
			var entries = $.get('[[SetData]]');

			// 5. Repeat for each p that is an element of entries,
				// a. If p is not empty and SameValue(p, value) is true, then
					// i. Return undefined.
			if (MapHas(entries, value))
				return;

			// 6. Append p as the last element of entries.
			MapSet(entries, value, true);

			// 7. Return undefined.

		},

		clear: function clear() {
			// 15.14.5.3 Set.prototype.clear ()
			// The following steps are taken:

			// 1. Let S be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(S).
			var S = Object(this);

			var $ = Secrets(S);

			// 3. If S does not have a [[SetData]] internal property throw a TypeError exception.
			if (!$ || !$.has('[[SetData]]'))
				throw new TypeError('Object is not a Set.');

			// 4. Set the value of S’s [[SetData]] internal property to a new empty List.
			$.set('[[SetData]]', new Map());

			// 5. Return undefined.

		},

		delete: function delete_(value) {
			// 15.16.5.4 Map.prototype.delete ( value )
			// The following steps are taken:

			// 1. Let S be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(S).
			var S = Object(this);

			var $ = Secrets(S);

			// 3. If S does not have a [[SetData]] internal property throw a TypeError exception.
			if (!$ || !$.has('[[SetData]]'))
				throw new TypeError('Object is not a Set.');

			// 4. Let entries be the List that is the value of S’s [[SetData]] internal property.
			var entries = $.get('[[SetData]]');

			// 5. Repeat for each e that is an element of entries, in original insertion order
				// a. If e is not empty and SameValue(e, value) is true, then
					// i. Replace the element of entries whose value is e with an element whose value is empty.
					// ii. Return true.
			// 6. Return false.

			return MapDelete($.get('[[SetData]]'), value);

		},

		forEach: function forEach(callbackfn/*, thisArg */) {
			// 15.16.5.5 Set.prototype.forEach ( callbackfn , thisArg = undefined )
			// callbackfn should be a function that accepts two arguments. forEach calls callbackfn once for each value
			// present in the set object, in value insertion order. callbackfn is called only for values of the map
			// which actually exist; it is not called for keys that have been deleted from the set.
			// If a thisArg parameter is provided, it will be used as the this value for each invocation of callbackfn.
			// If it is not provided, undefined is used instead.
			// NOTE	If callbackfn is an Arrow Function, this was lexically bound when the function was created so
			// thisArg will have no effect.
			// callbackfn is called with two arguments: the value of the item and the Set object being traversed.
			// forEach does not directly mutate the object on which it is called but the object may be mutated by the
			// calls to callbackfn.
			// NOTE	Each value is normally visited only once. However, if a value will be revisited if it is deleted
			// after it has been visited and then re-added before the to forEach call completes. Values that are deleted
			// after the call to forEach begins and before being visited are not visited unless the value is added again
			// before the to forEach call completes. New values added, after the call to forEach begins are visited.
			// When the forEach method is called with one or two arguments, the following steps are taken:

			var thisArg = arguments[1];

			// 1. Let S be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(S).
			var S = Object(this);

			var $ = Secrets(S);

			// 3. If S does not have a [[SetData]] internal property throw a TypeError exception.
			if (!$ || !$.has('[[SetData]]'))
				throw new TypeError('Object is not a Set.');

			// 4. If IsCallable(callbackfn) is false, throw a TypeError exception.
			if (typeof callbackfn != 'function')
				throw new TypeError('Function expected in call to forEach.');

			// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
			var T = thisArg;

			// 6. Let entries be the List that is the value of S’s [[SetData]] internal property.
			var entries = $.get('[[SetData]]');

			// 7. Repeat for each e that is an element of entries,in original insertion order
				// a. If e is not empty, then
					// i. Let funcResult be the result of calling the [[Call]] internal method of callbackfn with T as
					// thisArgument and a List containing e and S as argumentsList.
					// ii.	ReturnIfAbrupt(funcResult).
			MapForEach(entries, function(value, key) {
				call(callbackfn, T, key, S);
			});

			// 8. Return undefined.

			// The length property of the forEach method is 1.

		},

		// TODO: contains?
		has: function has(value) {
			// 15.16.5.6 Set.prototype.has ( value )
			// The following steps are taken:

			// 1. Let S be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(S).
			var S = Object(this);

			var $ = Secrets(S);

			// 3. If S does not have a [[SetData]] internal property throw a TypeError exception.
			if (!$ || !$.has('[[SetData]]'))
				throw new TypeError('Object is not a Set.');

			// 4. Let entries be the List that is the value of S’s [[SetData]] internal property.
			var entries = $.get('[[SetData]]');

			// 5. Repeat for each e that is an element of entries,
				// a. If e is not empty and SameValue(e, value), then return true.
			// 6. Return false.

			return MapHas(entries, value);

		},

		get size() {
			// 15.16.5.7 get Set.prototype.size
			// Set.prototype.size is an accessor property whose set accessor function is undefined. Its get accessor
			// function performs the following steps are taken:

			// 1. Let S be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(S).
			var S = Object(this);

			var $ = Secrets(S);

			// 3. If S does not have a [[SetData]] internal property throw a TypeError exception.
			if (!$ || !$.has('[[SetData]]'))
				throw new TypeError('Object is not a Set.');

			// 4. Let entries be the List that is the value of S’s [[SetData]] internal property.
			var entries = $.get('[[SetData]]');

			// 5. Let count be 0.
			// 6. For each e that is an element of entries
				// a. If e is not empty then i.	Set count to count+1.
			// 7. Return count.

			return MapSize(entries);

		},

		values: function values() {
			// 15.16.5.8 Map.prototype.values ( )
			// The following steps are taken:

			// 1. Let S be the result of calling ToObject with the this value as its argument.
			// 2. ReturnIfAbrupt(S).
			var S = Object(this);

			// 3. Return the result of calling the CreateSetIterator abstract operation with argument S.
			return CreateSetIterator(S);

		}

	});

	// 15.16.5.9 Map.prototype.@@iterator ( )
	// The initial value of the @@iterator property is the same function object as the initial value of the values
	// property.
	$$(Set.prototype, 'iterator', Set.prototype.values);

	// 15.16.5.10 Set.prototype.@@toStringTag
	// The initial value of the @@toStringTag property is the string value "Set".
	$$(Set.prototype, 'toStringTag', 'Set');

	function CreateSetIterator(set) {
		// 15.16.7.1 CreateSetIterator Abstract Operation
		// The value and @@iterator methods of Set objects return interator objects. The abstract operation
		// CreateSetIterator with argument set is used to create and such iterator objects. It performs the following
		// steps:

		// 1. Let S be the result of calling ToObject(set).
		// 2. ReturnIfAbrupt(S).
		var S = Object(set);

		var $ = Secrets(S);

		// 3. If S does not have a [[SetData]] internal property throw a TypeError exception.
		if (!$ || !$.has('[[SetData]]'))
			throw new TypeError('Object is not a Set.');

		// 4. Let entries be the List that is the value of S’s [[SetData]] internal property.
		// TODO: Step 4 will probably be removed (since entries is never used in the spec) but we need to still get it
		// due to our divergence from steps 6 and 7.
		var entries = $.get('[[SetData]]');

		// 5. Let itr be the result of the abstract operation ObjectCreate with the intrinsic object
		// %SetIteratorPrototype% as its argument.
		var itr = create(SetIteratorPrototype);

		var $i = Secrets(itr);

		// 6. Add a [[IteratedSet]] internal property to itr with value S.
		// 7. Add a [[SetNextIndex]] internal property to itr with value 0.

		// [We get the Map's keys() iterator instead of the steps above.]
		$i.set('SetIterator:MapIterator:values', MapKeys(entries));

		// 8. Return itr.
		return itr;

	}

	var SetIteratorPrototype = { };

	defineValuesWC(SetIteratorPrototype, {

		next: function next() {
			// 15.16.7.2.2 SetIterator.prototype.next( )

			// 1. Let O be the this value.
			var O = this;

			// 2. If Type(O) is not Object, throw a TypeError exception.
			if (Object(O) !== O)
				throw new TypeError('Object expected: ' + O);

			var $ = Secrets(O);

			// 3. If O does not have all of the internal properties of a Set Iterator Instance (15.16.7.1.2), throw a
			// TypeError exception.
			if (!$ || !$.has('SetIterator:MapIterator:values'))
				throw new TypeError('SetIterator expected.');

			// 4. Let s be the value of the [[IteratedSet]] internal property of O.
			// 5. Let index be the value of the [[SetNextIndex]] internal property of O.
			var values = $.get('SetIterator:MapIterator:values');

			// 6. Assert: s has a [[SetData]] internal property.
			// 7. Let entries be the List that is the value of the [[SetData]] internal property of s.
			// 8. Repeat while index is less than the total number of element of entries. The number of elements must be
			// redetermined each time this method is evaluated.
				// a. Let e be the element at 0-origined insertion position index of entries.
				// b. Set index to index+1;
				// c. Set the [[SetNextIndex]] internal property of O to index.
				// d. If e is not empty, then
					// i. If itemKind is "key" then, return e.
			// 9. Return Completion {[[type]]: throw, [[value]]: %StopIteration%, [[target]]: empty}.

			return MapIteratorNext(values);

		}

	});

	$$(SetIteratorPrototype, 'iterator', function $$iterator() {
		// 15.16.7.2.3 SetIterator.prototype.@@iterator ( )
		// The following steps are taken:

		// 1.	Return the this value.
		return this;

	});

	// 15.16.7.2.4 SetIterator.prototype.@@toStringTag
	// The initial value of the @@toStringTag property is the string value "Set Iterator".
	$$(SetIteratorPrototype, 'toStringTag', 'Set Iterator');

	return Set;

})();
var StopIteration = (function() {

	var StopIteration = new (function StopIteration() { })();

	$$(StopIteration, 'toStringTag', 'StopIteration');

	return StopIteration;

})();
(function() {

	var NumberToString = lazyBind(Number.prototype.toString);

	function pad(s) {
		while (s.length < 4) s = '0' + s;
		return s;
	}

	shimProps(String, {

		fromCodePoint: function fromCodePoint(/* ...codePoints */) {

			// 1. Assert: codePoints is a well-formed rest parameter object.
			// TODO: ?
			var codePoints = arguments;

			// 2. Let length be the result of calling the [[Get]] internal method of codePoints with argument "length".
			var length = codePoints.length;

			// 3. Let elements be a new List.
			var elements = [ ];

			// 4. Let nextIndex be 0.
			var nextIndex = 0;

			var next, nextCP;

			// 5. Repeat while nextIndex < length
			while (nextIndex < length) {

				// a. Let next be the result of calling the [[Get]] internal method of codePoints with argument
				// ToString(nextIndex).
				next = codePoints[nextIndex];

				// b. Let nextCP be ToNumber(next).
				// c. ReturnIfAbrupt(nextCP).
				nextCP = Number(next);

				// d. If SameValue(nextCP, ToInteger(nextCP)) is false,then throw a RangeError exception.
				if (nextCP != NumberToInt(nextCP))
					throw new RangeError('Integer expected: ' + nextCP);

				// e. If nextCP < 0 or nextCP > 0x10FFFF, then throw a RangeError exception.
				if (nextCP < 0 || nextCP > 0x10ffff)
					throw new RangeError('Index out of range: ' + nextCP);

				// f. Append the elements of the UTF-16 Encoding (clause 6) of nextCP to the end of elements.
				push(elements, eval('"\\u' + pad(NumberToString(nextCP, 16)) + '"'));

				// g. Let nextIndex be nextIndex + 1.
				nextIndex++;

			}

			// 6. Return the string value whose elements are, in order, the elements in the List elements.
			// If length is 0, the empty string is returned.
			return join(elements, '');

		},

		raw: function raw(callSite/*, ...substitutions */) {

			// 1. Assert: substitutions is a well-formed rest parameter object.
			// TODO: ?
			var substitutions = slice(arguments, 1);

			// 2. Let cooked be ToObject(callSite).
			// 3. ReturnIfAbrupt(cooked).
			var cooked = Object(callSite);

			// 4. Let rawValue be the result of calling the [[Get]] internal method of cooked with argument "raw".
			var rawValue = cooked.raw;

			// 5. Let raw be ToObject(rawValue).
			// 6. ReturnIfAbrupt(raw).
			var raw = Object(rawValue);

			// 7. Let len be the result of calling the [[Get]] internal method of raw with argument "length".
			var len = raw.length;

			// 8. Let literalSegments be ToUint(len)
			// 9. ReturnIfAbrupt(literalSegments).
			var literalSegments = len >>> 0;

			// 10. If literalSegments = 0, then return the empty string.
			if (literalSegments == 0) return '';

			// 11. Let stringElements be a new List.
			var stringElements = [ ];

			// 12. Let nextIndex be 0.
			var nextIndex = 0;

			var nextKey, next, nextSeg, nextSub;

			// 13. Repeat while nextIndex < literalSegments
			while (nextIndex < literalSegments) {

				// a. Let nextKey be ToString(nextIndex).
				nextKey = String(nextIndex);

				// b. Let next be the result of calling the [[Get]] internal method of raw with argument nextKey.
				next = raw[nextKey];

				// c. Let nextSeg be ToString(next).
				// d. ReturnIfAbrupt(nextSeg).
				nextSeg = String(next);

				// e. Append in order the code unit elements of nextSeg to the end of stringElements.
				push(stringElements, nextSeg);

				// f. If nextIndex + 1 = literalSegments, then
				if (nextIndex + 1 == literalSegments)
					// i. Return the string value whose elements are, in order, the elements in the List stringElements.
					// If length is 0, the empty string is returned.
					return join(stringElements, '');

				// g. Let next be the result of calling the [[Get]] internal method of substitutions with argument
				// nextKey.
				next = substitutions[nextKey];

				// h. Let nextSub be ToString(next).
				// i. ReturnIfAbrupt(nextSub).
				nextSub = String(next);

				// j. Append in order the code unit elements of nextSub to the end of stringElements.
				push(stringElements, nextSub);

				// k. Let nextIndex be nextIndex + 1.
				nextIndex++;

			}

			// TODO: return?

		}

	});

	shimProps(String.prototype, {

		repeat: function repeat(count) {
			// ECMA-262 Ed. 6, 9-27-12. 15.5.4.21

			// 1. ReturnIfAbrupt(CheckObjectCoercible(this value)).
			if (this == null)
				throw new TypeError('Context is null or undefined: ' + this);

			// 2. Let S be the result of calling ToString, giving it the this value as its argument.
			// 3. ReturnIfAbrupt(S).
			var S = String(this);

			// 4. Let n be the result of calling ToInteger(count).
			// According to Jason Orendorff, "Evaluating x | 0 produces ToInteger(x)." (http://wiki.ecmascript.org/doku.php?id=harmony:number.tointeger, comment)
			// I believe this is incorrect because ECMA-262 Ed. 6 9-27-12. 9.1.4 says ToInteger
			// can result in Infinity, while x | 0 cannot.
			// 5. ReturnIfAbrupt(n).
			var n = NumberToInt(count);

			// 6. If n ≤ 0, then throw a RangeError exception.
			if (n <= 0) throw new RangeError('count must be greater than 0: ' + count);

			// 7. If n is +Infinity, then throw a RangeError Exception.
			if (n == Infinity) throw new RangeError('count cannot be Infinity.');

			// 8. Let T be a String value that is made from n copies of S appended together.
			var T = '';
			for (var i = 0; i < n; i++)
				T += S;

			// 9. Return T.
			return T;

		},

		startsWith: function startsWith(searchString/*, position */) {

			// The length property of the startsWith method is 1.
			var position = arguments[1];

			// 1. ReturnIfAbrupt(CheckObjectCoercible(this value)).
			if (this == null)
				throw new TypeError('Context is null or undefined: ' + this);

			// 2. Let S be the result of calling ToString, giving it the this value as its argument.
			// 3. ReturnIfAbrupt(S).
			var S = String(this);

			// 4. Let searchStr be ToString(searchString).
			// 5. ReturnIfAbrupt(searchStr).
			var searchStr = String(searchString);

			// 6. Let pos be ToInteger(position). (If position is undefined, this step produces the value 0).
			// 7. ReturnIfAbrupt(pos).
			var pos = NumberToInt(position);

			// 8. Let len be the number of elements in S.
			var len = S.length;

			// 9. Let start be min(max(pos, 0), len).
			var start = min(max(pos, 0), len);

			// 10. Let searchLength be the number of elements in searchString.
			var searchLength = searchStr.length;

			// 11. If searchLength+start is greater than len, return false.
			if (searchLength + start > len)
				return false;

			// 12. If the searchLength sequence of elements of S starting at start is the same as the full
			// element sequence of searchString, return true.
			if (StringSlice(S, start, start + searchLength) == searchStr)
				return true;

			// 13. Otherwise, return false.
			return false;

		},

		endsWith: function endsWith(searchString/*, endPosition*/) {

			// The length property of the endsWith method is 1.
			var endPosition = arguments[1];

			// 1. ReturnIfAbrupt(CheckObjectCoercible(this value)).
			if (this == null)
				throw new TypeError('Context is null or undefined: ' + this);

			// 2. Let S be the result of calling ToString, giving it the this value as its argument.
			// 3. ReturnIfAbrupt(S).
			var S = String(this);

			// 4. Let searchStr be ToString(searchString).
			// 5. ReturnIfAbrupt(searchStr).
			var searchStr = String(searchString);

			// 6. Let len be the number of elements in S.
			var len = S.length;

			// 7. If endPosition is undefined, let pos be len, else let pos be ToInteger(endPosition).
			// 8. ReturnIfAbrupt(pos).
			var pos = endPosition === undefined ? len : NumberToInt(endPosition);

			// 9. Let end be min(max(pos, 0), len).
			var end = min(max(pos, 0), len);

			// 10. Let searchLength be the number of elements in searchString.
			var searchLength = searchStr.length;

			// 11. Let start be end - searchLength.
			var start = end - searchLength;

			// 12. If start is less than 0, return false.
			if (start < 0) return false;

			// 13. If the searchLength sequence of elements of S starting at start is the same as the full element
			// sequence of searchString, return true.
			if (StringSlice(S, start, start + searchLength) == searchStr)
				return true;

			// 14. Otherwise, return false.
			return false;

		},

		contains: function contains(searchString/*, position */) {

			var position = arguments[1];

			// 1. ReturnIfAbrupt(CheckObjectCoercible(this value)).
			if (this == null)
				throw new TypeError('Context is null or undefined: ' + this);

			// 2. Let S be the result of calling ToString, giving it the this value as its argument.
			// 3. ReturnIfAbrupt(S).
			var S = String(this);

			// 4. Let searchStr be ToString(searchString).
			// 5. ReturnIfAbrupt(searchStr).
			var searchStr = String(searchString);

			// 6. Let pos be ToInteger(position). (If position is undefined, this step produces the value 0).
			// 7. ReturnIfAbrupt(pos).
			var pos = NumberToInt(position);

			// 8. Let len be the number of elements in S.
			var len = S.length;

			// 9. Let start be min(max(pos, 0), len).
			var start = min(max(pos, 0), len);

			// 10. Let searchLen be the number of characters in searchStr.
			var searchLen = searchStr.length;

			// 11. If there exists any integer k not smaller than start such that k + searchLen is not greater than
			// len, and for all nonnegative integers j less than searchLen, the character at position k+j of S is
			// the same as the character at position j of searchStr, return true; but if there is no such integer k,
			// return false.
			/* var test;
			for (var k = start; k + searchLen <= len; k++) {
				test = true;
				for (var j = 0; j < searchLen; j++) {
					if (S.charAt(k + j) != searchStr.charAt(j)) {
						test = false;
						break;
					}
				}
				if (test) return true;
			}
			return false; */

			return StringIndexOf(S, searchStr, start) != -1;

		},

		codePointAt: function codePointAt(pos) {

			// 1. ReturnIfAbrupt(CheckObjectCoercible(this value)).
			if (this == null)
				throw new TypeError('Context is null or undefined: ' + this);

			// 2. Let S be the result of calling ToString, giving it the this value as its argument.
			// 3. ReturnIfAbrupt(S).
			var S = String(this);

			// 4. Let position be ToInteger(pos).
			// 5. ReturnIfAbrupt(position).
			var position = NumberToInt(pos);

			// 6. Let size be the number of elements in S.
			var size = S.length;

			// 7. If position < 0 or position ≥ size, return undefined.
			if (position < 0 || position >= size) return undefined;

			// 8. Let first be the code unit value of the element at index position in the String S..
			var first = charCodeAt(S, position);

			// 9. If first < 0xD800 or first > 0xDBFF or position+1 = size, then return first.
			if (first < 0xd800 || first > 0xdbff || position + 1 == size) return first;

			// 10. Let second be the code unit value of the element at position position+1 in the String S.
			var second = charCodeAt(S, position + 1);

			// 11. If second < 0xDC00 or first > 0xDFFF, then return first.
			if (second < 0xdc00 || first > 0xdfff) return first;

			// 12. Return ((first – 0xD800) × 1024) + (second – 0xDC00) + 0x10000.
			return (first - 0xd800) * 1024 + second - 0xdc00 + 0x10000;

		}

	});

})();

	var shims = {
			StopIteration: StopIteration,
			WeakMap: WeakMap,
			Map: Map,
			Set: Set,
			Reflect: Reflect
		},

		is = Object.is;

	// Shim to global.
	forEach(keys(shims), function(key) {
		if (!(key in _global) || forceShim)
			_global[key] = shims[key];
	});

	// Export createSecret.
	if (typeof exports == 'object' && exports != null) {
		exports.createSecret = createSecret;
		exports.$$ = $$;
	}

	function defineValueWC(obj, name, value) {
		defineProperty(obj, name, own({
			value: value,
			enumerable: false,
			writable: true,
			configurable: true
		}));
	}

	function defineValuesWC(obj, map) {
		forEach(keys(map), function(key) {
			var desc = own(Object.getOwnPropertyDescriptor(map, key)),
				value = desc.value;
			if (value)
				defineValueWC(obj, key, value);
			else {
				desc.enumerable = false;
				desc.configurable = true;
				defineProperty(obj, key, desc);
			}
		});
	}

	function shimProps(obj/*, ?attrs, methods */) {

		var attrs, methods,
			enumerable = false, writable = true, configurable = true;

		if (arguments.length > 2) {

			attrs = arguments[1];
			methods = arguments[2];

			if ('enumerable' in attrs) enumerable = attrs.enumerable;
			if ('writable' in attrs) writable = attrs.writable;
			if ('configurable' in attrs) configurable = attrs.configurable;

		} else methods = arguments[1];

		forEach(keys(methods), function(name) {
			if (!(name in obj))
				defineProperty(obj, name, own({
					value: methods[name],
					enumerable: enumerable,
					writable: writable,
					configurable: configurable
				}));
		});

	}

	function getTagOf(obj) {
		return StringSlice(toString(obj), 8, -1);
	}

	function getPropertyDescriptor(obj, key) {

		// TODO: symbols -- also for Object.getOwnPropertyDescriptor (if symbols should work with that)
		// TODO: coerce obj?

		if (!(key in obj))
			return;

		var desc = getOwnPropertyDescriptor(obj, key)
			|| getPropertyDescriptor(getPrototypeOf(obj), key);

	}

	function own(obj) {

		var O = create(null);

		forEach(getOwnPropertyNames(obj), function(key) {
			defineProperty(O, key,
				getOwnPropertyDescriptor(obj, key));
		});

		return O;

	}

})(Object, String, Number, Error, TypeError, RangeError, isNaN, Infinity, NaN);;
			var $$ = exports.$$;
			// Note: Anything that includes candy with !!!include() **must** provide $$ from Harmonize.
var candy = (function(SecretExports, Object, Array, Function, String, Number, TypeError, RangeError, Error, WeakMap, Map, Set, Reflect) {

	'use strict';

	var createSecret = SecretExports.createSecret,
		$$ = SecretExports.$$,

		// Override any `module` or `exports` variables which exist outside of this
		// scope; otherwise, some includes will try to mix into them.
		module = null, exports = null;

	// Let's check to see if we have what appears to be a complete ES6 environment, along with $$.
	// TODO: Once ES6 environments appear that support @@iterator, check for the built-one as well.
	if (typeof WeakMap != 'function'
		|| typeof Map != 'function'
		|| typeof Set != 'function'
		|| typeof $$ != 'function'
		|| !WeakMap.prototype
		|| !Map.prototype
		|| !Set.prototype
		|| typeof Map.prototype.get != 'function'
		|| typeof Map.prototype.set != 'function'
		|| typeof Set.prototype.has != 'function' // TODO: rename contains when ES6 draft matches
		|| typeof Object.is != 'function'
		|| typeof Reflect.has != 'function' // TODO: We expect Reflect to need to be imported as a module, but how this will work out is yet unknown.
		|| typeof Reflect.hasOwn != 'function')
		throw new Error('ES6 environment missing or incomplete. Harmonize.js (or compatible shim) is required to use candy.js.');

	var $Candy = createSecret(),
	$Function = createSecret(),
	$Iterable = createSecret(),

 	// `eval` is reserved in strict mode.
 	// Also, we want to use indirect eval so that implementations can take advantage
 	// of memory & performance enhancements which are possible without direct eval.
	_eval = eval,

	// The following are for internal use. They're needed to get lazyBind off the ground.
	_apply = Function.prototype.call.bind(Function.prototype.apply),
	_ArraySlice = Function.prototype.call.bind(Array.prototype.slice),
	_concat = Function.prototype.call.bind(Array.prototype.concat),
	_push = Function.prototype.call.bind(Array.prototype.push),
	_join = Function.prototype.call.bind(Array.prototype.join),
	_replace = Function.prototype.call.bind(String.prototype.replace),
	_forEach = Function.prototype.call.bind(Array.prototype.forEach),

	is = Object.is,
	create = Object.create,
	getPrototypeOf = Object.getPrototypeOf,
	isPrototypeOf = lazyBind(Object.prototype.isPrototypeOf),
	ToString = lazyBind(Object.prototype.toString),
	keys = Object.keys,
	getOwnPropertyNames = Object.getOwnPropertyNames,
	_getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
	_defineProperty = Object.defineProperty,
	isExtensible = Object.isExtensible,

	has = Reflect.has,
	hasOwn = Reflect.hasOwn,

	call = lazyBind(Function.prototype.call),
	apply = lazyBind(Function.prototype.apply),

	isArray = Array.isArray,
	ArraySlice = lazyBind(Array.prototype.slice),
	concat = lazyBind(Array.prototype.concat),
	ArrayForEach = lazyBind(Array.prototype.forEach),
	ArraySome = lazyBind(Array.prototype.some),
	ArrayEvery = lazyBind(Array.prototype.every),
	ArrayReduce = lazyBind(Array.prototype.reduce),
	join = lazyBind(Array.prototype.join),
	push = lazyBind(Array.prototype.push),
	pop = lazyBind(Array.prototype.pop),
	shift = lazyBind(Array.prototype.shift),
	unshift = lazyBind(Array.prototype.unshift),
	sort = lazyBind(Array.prototype.sort),
	contains = lazyBind(Array.prototype.contains),
	reverse = lazyBind(Array.prototype.reverse),
	ArrayIterator = lazyBind($$(Array.prototype, 'iterator')),

	StringSlice = lazyBind(String.prototype.slice),
	split = lazyBind(String.prototype.split),
	replace = lazyBind(String.prototype.replace),

	random = Math.random,

	WeakMapGet = lazyBind(WeakMap.prototype.get),
	WeakMapSet = lazyBind(WeakMap.prototype.set),

	// TODO: has might change to contains in upcoming draft
	SetContains = lazyBind(Set.prototype.has),

	_setTimeout = typeof setTimeout == 'function' ? setTimeout : undefined,
	_clearTimeout = typeof clearTimeout == 'function' ? clearTimeout : undefined;

function slice(obj/*, from, to */) {
	var tag = getTagOf(obj);
	return apply(tag == 'String' || tag == '~String' ? StringSlice : ArraySlice, null, arguments);
}

function methods(builtIn, staticO, instance) {

	var O = create(null),
		instanceMethods = create(null);

	defineProperty(O, 'instance', {

		value: instanceMethods,

		enumerable: false,
		writable: true,
		configurable: true

	});

	// Lazy Bind builtIn.prototype methods and instance methods
	forEach([ builtIn && builtIn.prototype, instance ], function(obj) {

		if (!obj) return;

		forEach(getOwnPropertyNames(obj), function(name) {

			if (name == 'constructor') return;

			var desc = getOwnPropertyDescriptor(obj, name),
				method = desc && desc.value;

			if (typeof method == 'function') {

				defineProperty(O, name, {

					value: lazyBind(method),

					enumerable: false,
					writable: true,
					configurable: true

				});

				defineProperty(instanceMethods, name, {

 					value: method,

					enumerable: false,
					writable: true,
					configurable: true

				});

			}

		});

	});

	if (staticO != null)
		forEach(keys(staticO), function(name) {

			if (name == 'constructor') return;

			var desc = getOwnPropertyDescriptor(staticO, name),
				method = desc && desc.value;

			if (typeof method == 'function')
				defineProperty(O, name, {

					value: method,

					enumerable: false,
					writable: true,
					configurable: true

				});

		});

	return O;

}

function CallConstruct(withObj, onObj) {
	var construct = withObj.construct || $Candy(withObj).construct,
		constructed;
	if (typeof construct == 'function') {
		constructed = call(construct, onObj);
		if (constructed != null && typeof constructed == 'object')
			onObj = constructed;
	}
	return onObj;
}
function isIterable(obj) {
	var O = Object(obj);
	return 'length' in O || typeof $$(O, 'iterator') == 'function';
}

function ToIterable(obj) {

	var O = Object(obj), S;

	if (typeof $$(O, 'iterator') == 'function')
		return O;

	if (!('length' in O))
		throw new TypeError('Cannot convert object to an iterator.');

	return _convertWrap(function() {
		// We copy ConvertedIteratorPrototype for now so that it can't be mucked with by external code.
		// This *could* be an important step for ensuring integrity, since much of this and other libraries
		// may depend on `forEach` with something like `arguments` (which will be converted using ToIterable)
		// working correctly.
		// TODO: Think more about whether ConvertedIteratorPrototype should be exposed. If so, the `copy` below can be changed to `create`.
		// Note: My current thought is that it should stay as-is.
		var iter = copy(ConvertedIteratorPrototype);
		$Iterable(iter).IterableObject = O;
		$Iterable(iter).IterableIndex = 0;
		return iter;
	});

};

function _convertWrap(iterator) {
	var obj = create(null);
	$$(obj, 'iterator', iterator);
	return obj;
}

function forEach(obj, f/*, thisArg */) {

	if (obj == null)
		throw new TypeError('forEach cannot be called on null or undefined.');

	var thisArg = arguments[2],

		O = Object(obj),
		iter = $$(O, 'iterator'),
		iterator, next;

	if (iter)
		iterator = call(iter, O);
	else if ('length' in O)
		iterator = call($$(ToIterable(O), 'iterator'), O);
	else
		throw new TypeError('Object cannot be iterated.');

	try {
		// TODO: What to do about the key/value pair vs value only problem?
		// TODO: ! Note that the signature of the callback function is different from Array#forEach because the key/index is not passed as an argument. This is potentially a big problem. THINK MUCH ABOUT THIS!
		while (true)
			call(f, thisArg, iterator.next(), O);
	} catch(x) {
		if (getTagOf(x) != 'StopIteration')
			throw x;
	}

}

function map(obj, f/*, thisArg */) {
	// If a `construct` function property is defined on the object, this function will be called
	// on the mapped array. 

	if (obj == null)
		throw new TypeError('map cannot be called on null or undefined.');

	var thisArg = arguments[2],
		mapped = [ ],
		O = Object(obj);

	forEach(O, function() {
		push(mapped, apply(f, thisArg, arguments));
	});

	return CallConstruct(O, mapped);

}

function filter(obj, f/*, thisArg */) {
	// See note on `map` regarding construct.

	if (obj == null)
		throw new TypeError('filter cannot be called on null or undefined.');

	var thisArg = arguments[2],
		filtered = [ ],
		O = Object(obj);

	forEach(O, function(v) {
		if (apply(f, thisArg, arguments))
			push(filtered, v);
	});

	return CallConstruct(O, filtered);

}

function some(obj, f/*, thisArg */) {

	if (obj == null)
		throw new TypeError('some cannot be called on null or undefined.');

	var thisArg = arguments[2],
		ret = false;

	forEach(obj, function() {
		if (apply(f, thisArg, arguments)) {
			ret = true;
			// Since forEach itself waits for stopIteration, this should work to break the forEach.
			throw StopIteration;
		}
	});

	return ret;

}

function every(obj, f/*, thisArg */) {

	if (obj == null)
		throw new TypeError('every cannot be called on null or undefined.');

	var thisArg = arguments[2],
		ret = true;

	forEach(obj, function() {
		if (!apply(f, thisArg, arguments)) {
			ret = false;
			throw StopIteration;
		}
	});

	return ret;

}

function reduce(obj, f/*, initialValue, thisArg */) {

	if (obj == null)
		throw new TypeError('reduce cannot be called on null or undefined.');

	var initialValue = arguments[2],
		thisArg = arguments[3],
		prev = initialValue,
		noInitial = arguments.length < 2;

	forEach(obj, function(v, i, obj) {
		if (i == 0 && noInitial) {
			prev = v;
			return;
		}
		prev = call(f, thisArg, prev, v, i, obj)
	});

	return prev;

}

var ConvertedIteratorPrototype = {

	next: function next() {

		if (this == null)
			throw new TypeError('next cannot be called on null or undefined.');

		var O = Object(this),
			object = $Iterable(O).IterableObject;

		if (!object)
			throw new TypeError('next can only be called on a ConvertedIterator.');

		var $I = $Iterable(O),
			index = $I.IterableIndex,
			L = object.length >>> 0;

		while (index < L) {
			if (index in object) {
				$I.IterableIndex = index + 1;
				// TODO: Whether a pair is returned should probably depend on what Array.prototype@iterator() ends up doing.
				// Keep up with the spec.
				return object[index];
				// return [ index, object[index] ];
			}
			index++;
		}

		$I.IterableIndex = index;
		throw StopIteration;

	}

};

$$(ConvertedIteratorPrototype, 'iterator', function $$iterator() {
	return this;
});

var Iterable = methods(

	null,

	{
		isIterable: isIterable,
		convert: ToIterable
	},

	{
		forEach: contextualize(forEach),
		map: contextualize(map),
		filter: contextualize(filter),
		some: contextualize(some),
		every: contextualize(every),
		reduce: contextualize(reduce)
		// reduceRight doesn't make sense with an iterable because you can't iterate in the reverse direction.
	}

);
// TODO: Make sure functions which return arrays from array-likes actually return the appropriate subclasses (see `stableSort`).
// TODO: Make sure anywhere this library (or others) create and use arrays (e.g. `var r = [ ]`) that they won't fall prey
// to attacks like `Object.defineProperty(Array.prototype, '1', { set: function() { throw 'gotcha!'; } });`. Array methods
// which are used to mutate arrays, such as `push`, should (by the spec) break under these types of attacks. It
// is better when using arrays internally to actually just use an empty object `create(null)` rather than a real array
// for this reason. Also see the `createSack` function in Resync.

function isArrayLike(obj) {
 	// This tests for a class of Array-like objects.
 	// An Array-like object is an object with a length property which isn't a string or a function.
 	var tag = getTagOf(obj);
 	return tag == 'Array' || tag == '~Array'
 		|| Object(obj) === obj
 			&& 'length' in obj
 			&& tag != 'String'
 			&& tag != '~String'
 			&& tag != 'Function'
 			&& tag != '~Function';
}

function ArrayEquals(a, b) {
	return a.length == b.length
		&& every(a, function(u, i) {
			return is(u, b[i]);
		});
}

function merge(a/*, ...b */) {
	// Similar to concat, but it can merge array-like objects, and it won't concat plain values.
	return ArrayReduce(ArraySlice(arguments, 1), function(prev, cur) {
		return concat(prev, ArraySlice(cur));
	}, ArraySlice(a));
}

function persuade(array/*, [from], [to], types */) {
	/* array can be a array of strings, constructors, and/or param objects.
	 * type can be any string which matches a typeof result or any of the extended types.
	 * multiple types for a single argument can be separated by a "|".
	 * type can also be an object with a "type" property and a "required" property,
	 * or it can  be a string preceeded with a "!" to designate that it's required.
	 */

	var A, from, to, types,
		argNum = 0, curItem;

	if (typeof arguments[argNum] == 'number') from = arguments[argNum++];
	if (typeof arguments[argNum] == 'number') to = arguments[argNum++];
	types = ArraySlice(arguments[argNum]);

	A = ArraySlice(array, from, to);

	curItem = shift(A);

	return map(types, function(type) {

		var modifiers, required = false, test = false, ret;

		if (getTypeOf(type) == 'object') {
			required = !!type.required;
			type = type.type;
		}

		if (typeof type == 'string') {
			test = some(split(type, '|'), function(u) {
				modifiers = exec(/^\W*/, u)[0];
				if (!required) required = test(/\!/, modifiers);
				u = StringSlice(u, modifiers.length);
				return getTypeOf(curItem) == u;
			});
		} else test = curItem instanceof type;

		if (test) {
			ret = curItem;
			curItem = shift(A);
		}

		return ret;

	});

}

function pushAll(to, what) {
	return apply(push, to, what);
}

function flatten(array) {
	var flattened = create(null);
	forEach(array, function(u) {
		if (isArrayLike(u))
			pushAll(flattened, flatten(u));
		else push(flattened, u);
	});
	return ArraySlice(flattened);
}

function mapToObject(array, f/*, context */) {
	// TODO: Better name?

	var obj = create(null),
		context = arguments[2];

	// If no function is specified, a default one will be provided which just returns each item.
	if (f == null)
		f = identity;

	if (typeof f != 'function')
		throw new TypeError('Function expected: ' + f);

	forEach(array,
		function(u, i) {
			var pair = call(f, context, u, i, obj);
			if (pair != null)
				obj[pair[0]] = pair[1];
		});

	return obj;

}

function toTruthTable(array) {
	// TODO: Better name?
	var obj = create(null);
	forEach(array,
		function(key) { obj[key] = true; });
	return obj;
}

function search(array, value) {
	// Similar to indexOf, but matches with egal when needed to keep with ES5 SameValue function.
	var index = -1;
	if (v !== v || v === 0) {
		// Use egal to test NaN and +0/-0 to keep with ES5 SameValue function.
		some(array, function(u, i) {
			if (is(u, v)) {
				index = i;
				return true;
			}
		});
		return index;
	} else {
		// Use indexOf when possible, for speed.
		return indexOf(array, value);
	}
}

// Provides a stable sort, which doesn't alter the original array.
// Note: This function initializes itself the first time it is called.
function stableSort() {
	// Let's use built-in methods directly here for performance.
	var lazyBind = Function.prototype.bind.bind(Function.prototype.call),
		R = Array.prototype,
		_map = lazyBind(R.map),
		_every = lazyBind(R.every),
		_sort = lazyBind(R.sort),
		_ArrayFrom = Array.from,
		nativeIsStable = (function() {
			return testStability(32, 2) && testStability(512, 16);
			function testStability(size, resolution) {
				var res = createRange(resolution),
					r = _map(createRange(size), function(u) {
						return mixin(map(res, function() {
							return random() > .5 ? 0 : 1;
						}), { i: u });
					});
				return _every(res, function(i) {
					_sort(r, function(a, b) {
						return a[i] - b[i];
					});
					return _every(r, function(u, j) {
						var next = r[j + 1];
						if (!next) return true;
						for (var k = 0; k <= i; k++) {
							if (u[k] < next[k]) return true;
						}
						return u.i < next.i;
					});
				});
			}
		})(),
		algorithm = nativeIsStable
			? lazyBind(Array.prototype.sort)
			: function stableSort(array, f) {
				var sortedInfo = _sort(_ArrayFrom(array, function(u, i) { return { value: u, index: i }; }),
						function(a, b) { return (f ? f(a.value, b.value) : a.value - b.value) || a.index - b.index; }),
					// The map is done *on the original `array` argument* instead of the sortedInfo array in case
					// `array` is a subclass of Array, in which case `sort` should return the subclass.
					sorted = _map(array,
						function(u, i) { return hasOwn(sortedInfo, i) ? sortedInfo[i].value : undefined; });
				return CallConstruct(array, sorted);
			};
	stableSort = algorithm;
	return apply(algorithm, this, arguments);
	function createRange(total) {
		var r = create(null);
		for (var i = 0; i < total; i++)
			push(r, i);
		return r;
	}
}
// Initialize stableSort
stableSort([ 1, 2, 3 ]);

// Same as Array#map, but any time the callback returns undefined, it is filtered from the result array.
function mapPartial(array, f) {
	return CallConstruct(array, without(ArrayFrom(array, f), undefined));
}

function without(array/*, ...values */) {
	// TODO: Whether we should continue to use contains depends on whether contains ends up using SameValue or ===.
	// We need without to consider NaN the same value as NaN, but +0/-0 is debatable.
	var values = slice(arguments, 1);
	return filter(array, function(u) {
			return !contains(values, u);
		});
}

function all(array) {
	return every(array, function(u) {
		return !!u;
	});
}

function any(array) {
	return some(array, function(u) {
		return !!u;
	});
}

var _Array = (function() {

	return methods(

		Array,

		null,

		// Instance methods
		{
			isArrayLike: contextualize(isArrayLike),
			equals: contextualize(ArrayEquals),
			merge: contextualize(merge),
			persuade: contextualize(persuade),
			pushAll: contextualize(pushAll),
			flatten: contextualize(flatten),
			mapToObject: contextualize(mapToObject),
			toTruthTable: contextualize(toTruthTable),
			search: contextualize(search),
			stableSort: contextualize(stableSort),
			mapPartial: contextualize(mapPartial),
			without: contextualize(without),
			all: contextualize(all),
			any: contextualize(any)
		}

	);

})();
function identity(X) {
	return X;
}

function echo(X) {
	return function echoer() { return X; };
}

// Let's memoize wrapper generators to avoid using eval too often.
var wrapGenerators = { },

	numWrapGenerators = 0,

	// Let's limit length to 512 for now. If someone wants to up it, they can.
	MAX_WRAPPER_LENGTH = 512,

	// Limit the number of generators which are cached to preserve memory in the unusual case that
	// someone creates many generators. We don't go to lengths to make the cache drop old, unused
	// values as there really shouldn't be a need for so many generators in the first place.
	MAX_CACHED_GENERATORS = 64;

// Creates a wrapper function with the same length as the original.
function createWrapper(f/*, length = f.length */, wrapF) {

	var original = f,
		length = arguments[2] !== undefined ? arguments[1] : original.length,
		args = [ ],
		generator = wrapGenerators && wrapGenerators[length];
	
	wrapF = arguments[2] !== undefined ? arguments[2] : arguments[1];

	if (typeof original != 'function')
		throw new TypeError('Function expected: ' + original);

	if (length < 0) //length = 0;
		// Let's throw an error temporarily, although long-term it may be better to >>> 0 like other ES functions.
		// TODO: Remove RangeError and put in something more temporary (either length = 0 or just let length >>>= 0)
		throw new RangeError('length cannot be less than 0.');

	length >>>= 0;
	if (length > MAX_WRAPPER_LENGTH)
		throw new Error('Maximum length allowed is ' + MAX_WRAPPER_LENGTH + ': ' + length);

	if (typeof wrapF != 'function')
		throw new TypeError('Function expected: ' + wrapF);

	if (!generator) {

		for (var i = 0; i < length; i++)
			_push(args, '$' + i);

			generator = _eval(
				'(function(wrapF, original, name, apply, _eval) {'
					+ '"use strict";'
					+ 'var wrapper = _eval("(function(wrapF, original, name, apply) {'
						+ 'return (function " + name + "_(' + _join(args, ',') + ') {'
							+ 'return apply(wrapF, this, arguments);'
						+ '});'
					+ '})");'
					+ 'wrapper.original = original;'
					+ 'return wrapper(wrapF, original, name, apply);'
				+ '})'
			);

		if (numWrapGenerators < MAX_CACHED_GENERATORS) {
			wrapGenerators[length] = generator;
			numWrapGenerators++;
		}

	}

	return generator(wrapF, original, _replace(original.name, /\W/g, '_'), _apply, _eval);

}

var defer = (function() {
	// We use process.nextTick (Node) or the window.postMessage (Browser) hack when available for a closer
	// "next tick" approximation. We fall back to setTimeout otherwise. Note that none of these are defined
	// as part of the ES5 spec (and probably won't be defined in ES6). defer is not possible with pure ES.

	var nextTick,
		_setImmediate = typeof setImmediate == 'function' ? setImmediate : null,
		_postMessage = typeof postMessage == 'function' ? postMessage : null,
		_addEventListener = typeof window == 'object' && typeof window.addEventListener == 'function'
			? window.addEventListener.bind(window) : null,
		_setTimeout = typeof setTimeout == 'function' ? setTimeout : null;

	if (typeof process == 'object' && typeof process.nextTick == 'function')
		nextTick = process.nextTick;
	else if (_setImmediate)
		nextTick = _setImmediate;
	else if (_postMessage && _addEventListener)
		nextTick = (function() {

			var messageId = '!nextTick:' + random() + ',' + random(),
				fs = [ ],
				pending = false;

			_addEventListener('message', handleMessage, true);

			return function nextTick(f) {
				push(fs, f);
				if (!pending) {
					pending = true;
					_postMessage(messageId, '*');
				}
			};

			function handleMessage(v) {
				// TODO: Should it wait 1 tick between each message? That's probably what the other
				// ways do (e.g. setImmediate/process.nextTick). Is there any testable difference between
				// calling them all immediately or waiting 1 tick between each one?
				var f, error;
				if (v.source == window && v.data == messageId) {
					pending = false;
					if (typeof v.stopPropagation == 'function')
						v.stopPropagation();
					while (f = shift(fs))
						try {
							f();
						} catch(x) {
							// Ignore any errors and continue to the next function.
							if (error === undefined)
								error = x;
						}
					// Rethrow if an error occurred.
					if (error !== undefined)
						throw error;
				}
			}

		})();
	else if (_setTimeout)
		nextTick = function(f) {
			_setTimeout(f, 0);
		};
	else
		nextTick = function() {
			throw new Error(
				'This environment doesn\'t support a known concurrency implementation.'
				+ 'Cannot call defer.'
			);
		};

	return function defer(f) {
		// TODO: context arg? relay args?

		if (typeof f != 'function')
			throw new TypeError('defer cannot be called a non-function: ' + f);

		nextTick(function() {
			apply(f, null);
		});

		/* Currently no promise is returned due to performance considerations.
		 * defer is considered a pretty low-level function and will probably be used frequently.
		 */

	}
})();

function lazyBind(f/*, ...preArgs */) {

	var preArgs = _ArraySlice(arguments, 1),
		lazyBound;

	if (typeof f != 'function')
		throw new TypeError('lazyBind cannot be called on a non-function: ' + f);

	lazyBound = $Function(f).lazyBound;
	if (lazyBound) return lazyBound;

	lazyBound = createWrapper(f, f.length + 1 - preArgs.length,
		function lazyBound(context) {
			return _apply(f, context, _concat(preArgs, _ArraySlice(arguments, 1)));
		}
	);

	$Function(lazyBound).contextualized = f;
	$Function(f).lazyBound = lazyBound;

	return lazyBound;

};

function contextualize(f/*, ...preArgs */) {
	// The opposite of lazyBind, this function returns a wrapper which calls f, passing the wrapper's context as
	// the first argument to f.

	var contextualized;

	if (typeof f != 'function')
		throw new TypeError('Function expected: ' + f);

	contextualized = $Function(f).contextualized;
	if (contextualized) return contextualized;

	var F = lazySpread(f),
		preArgs = ArraySlice(arguments, 1);

	contextualized = createWrapper(f, f.length - 1 - preArgs.length,
		function contextualizedMethod() {
			return F(concat([ this ], preArgs, slice(arguments)));
		}
	);

	$Function(contextualized).lazyBound = f;
	$Function(f).contextualized = contextualized;

	return contextualized;

}

function spread(f, arrayLike) {

	if (typeof f != 'function')
		throw new TypeError('Function expected: ' + f);

	if (!isArrayLike(arrayLike))
		throw new TypeError('Argument is not array-like: ' + arrayLike);

	return apply(f, this, arrayLike);

}

function lazySpread(f/*, preArgs */) {

	var preArgs = arguments[1] !== undefined ? arguments[1] : [ ],
		lazySpreed;

	if (typeof f != 'function')
		throw new TypeError('Function expected: ' + f);

	if (!isArrayLike(preArgs))
		throw new TypeError('preArgs argument must be an array-like object: ' + preArgs);

	lazySpreed = createWrapper(f, 1, function lazySpreed(arrayLike) {

		if (!isArrayLike(arrayLike))
			throw new TypeError('Argument is not array-like: ' + arrayLike);

		return apply(f, this, merge(preArgs, arrayLike));

	});

	$Function(lazySpreed).consolidated = f;
	$Function(f).lazySpreed = lazySpreed;

	return lazySpreed;

}

 function lazyTie(f/*, preArgs */) {

	var preArgs = arguments[1] !== undefined ? arguments[1] : [ ],
		lazySpreed;

	if (typeof f != 'function')
		throw new TypeError('Function expected: ' + f);

	if (!isArrayLike(preArgs))
		throw new TypeError('preArgs argument must be an array-like object: ' + preArgs);

	return lazyBind(lazySpread(f, preArgs));

}

function invert(f/*, length */) {

	var length = arguments[1],
		args = [ f ];

	if (typeof f != 'function')
		throw new TypeError('Function expected: ' + f);

	if (typeof length != 'undefined') {
		length >>>= 0;
		push(args, length);
	}

	push(args, function inverted() {
		var args;
		if (length !== undefined)
			args = slice(arguments, 0, length);
		else
			args = slice(arguments);
		return apply(f, null, reverse(args));
	});

	return spread(createWrapper, args);

}

function preload(f/*, ...args */) {
	// Similar to bind, but doesn't accept a context.

	var preArgs = ArraySlice(arguments, 1);

	if (typeof f != 'function')
		throw new TypeError('preload cannot be called on a non-function: ' + f);

	var L = f.length - preArgs.length;
	if (L < 0) L = 0;

	return createWrapper(f, L, function preloadedFunction() {
		return apply(f, this, merge(preArgs, arguments));
	});

}

function postload(f/*, ...args */) {
	// Similar to bind, but doesn't accept a context, and appends specified
	// arguments, rather than prepending them.

	var postArgs = arguments;

	if (typeof f != 'function')
		throw new TypeError('postload cannot be called on a non-function: ' + f);

	var L = f.length - postArgs.length;
	if (L < 0) L = 0;

	return createWrapper(f, L, function postloadedFunction() {
		return apply(f, this, merge(arguments, postArgs));
	});

}

function load(f/*, ...args */) {
	// Same as preload and postload, except doesn't allow additional arguments to be passed in.
	// Creates a function which always calls another function with the same arguments.

	var args = arguments;

	if (typeof f != 'function')
		throw new TypeError('load cannot be called on a non-function: ' + f);

	return createWrapper(f, 0, function loadedFunction() {
		return apply(f, this, args);
	});

}

function limit(f/*, max = 1 */) {
	// max can be a number or a function which returns true or false.
	// As a function, the number of times the function has been called will be passed
	// in the first argument to the max function.
	// max defaults to 1.

	var max = arguments[1],
		count = 0,
		isFunction = typeof max == 'function';

	if (typeof f != 'function')
		throw new TypeError('limit cannot be called on a non-function: ' + f);

	if (max === undefined) max = 1;
	else if (typeof max == 'number') max >>>= 0;
	else if (!isFunction) throw new TypeError('max must be a function or a number.');

	return createWrapper(f, function limitedFunction() {
		if (isFunction ? max(count) : (count >= max)) return;
		count++;
		return apply(f, this, arguments);
	});

}

function throttle(f/*, [arguments], [interval], [immediate], [contextual] */) {

	var args,
		fType = getTypeOf(f),
		F;

	if (fType == 'object') {
		args = [ ];
		if ('arguments' in f) args.push(f.arguments);
		if ('interval' in f) args.push(f.interval);
		if ('immediate' in f) args.push(f.immediate);
		if ('contextual' in f) args.push(f.contextual);
		if (!('function' in f)) throw new Error('function param expected in call to throttle.');
		F = f.function;
		if (typeof F != 'function') throw new TypeError('function param must be a function.');
		return apply(throttle, F, args);
	} else if (fType != 'function')
		throw new TypeError('throttle cannot be called on a non-function: ' + f);

	args = persuade(arguments, [ 'array', 'number|function', 'boolean', 'boolean' ]);
	var callArgs = args[1], interval = args[2], immediate = args[3], contextual = args[4];

	return _createChoke(f, callArgs, interval, false, immediate, contextual);

}

function debounce(f/*, [arguments], [interval], [immediate], [contextual] */) {

	var fType = getTypeOf(f),
		F;

	if (fType == 'object') {
		args = [ ];
		if ('arguments' in f) args.push(f.arguments);
		if ('interval' in f) args.push(f.interval);
		if ('immediate' in f) args.push(f.immediate);
		if ('contextual' in f) args.push(f.contextual);
		if (!('function' in f)) throw new Error('function param expected in call to debounce.');
		F = f.function;
		if (typeof F != 'function') throw new TypeError('function param must be a function.');
		return apply(debounce, F, args);
	} else if (typeof f != 'function')
		throw new TypeError('debounce cannot be called on a non-function: ' + f);

	var args = persuade(arguments, [ 'array', 'number|function', 'boolean', 'boolean' ]),
		callArgs = args[1], interval = args[2], immediate = args[3], contextual = args[4];

	return _createChoke(f, callArgs, interval, false, immediate, contextual);

}

function repeat(f, count/*, start */) {

	var start = arguments[2],
		ret = start;

	if (typeof f != 'function')
		throw new TypeError('repeat cannot be called on a non-function: ' + f);

	for (var i = 0; i < count; i++)
		ret = call(f, this, ret);

	return ret;

}

// contextual determines whether a function should be differentiated as a different call depending on the context
// in which it was called.
// Example:
//		var x = 0, f = debounce({ function: function() { console.log(x++); }, contextual: true }),
//			y = 0, g = debounce({ function: function() { console.log(x++); }, contextual: false }),
//			A = { f: f, g: g },
//			B = { f: f, g: g };
//		A.f(); B.f(); // Logs 1 and 2
//		A.g(); B.g(); // Logs only 1
function _createChoke(f, preArgs, interval, debounce, immediate, contextual) {

	var context = this, args, immediateCalled, tm, endTime, chokeMap;

	if (interval == null)
		interval = 0;

	var L = f.length - preArgs.length;
	if (L < 0) L = 0;

	return createWrapper(f, L,
		contextual
			? function chokedWrapper() {

				if (!chokeMap)
					chokeMap = new WeakMap();

				var F = WeakMapGet(chokeMap, this);

				if (!F)
					WeakMapSet(chokeMap, this, F = _createChoke(f, preArgs, interval, debounce, immediate, false));

				call(F, this, arguments);

			}
			: function chokedWrapper() {

				var time = +new Date(),
					nInterval = typeof interval == 'function' ? interval() : interval;

				nInterval >>>= 0;

				args = merge(preArgs, arguments);

				if (immediate && !immediateCalled) {
					apply(f, context, args);
					immediateCalled = true;
				}

				if (debounce && tm != null
					|| time + nInterval < endTime) {
					_clearTimeout(tm);
					tm = null;
				}

				if (tm == null) {
					tm = _setTimeout(function() {
						if (!immediate || !immediateCalled)
							apply(f, context, args);
						tm = null;
					}, nInterval);
					endTime = time + nInterval;
				}

			}
		);

}

var _Function = (function() {

	return methods(

		Function,

		// Static methods
		{
			identity: identity,
			echo: echo
		},

		// Instance methods
		{
			defer: contextualize(defer),
			lazyBind: contextualize(lazyBind),
			contextualize: contextualize(contextualize),
			spread: contextualize(spread),
			lazySpread: contextualize(lazySpread),
			lazyTie: contextualize(lazyTie),
			invert: contextualize(invert),
			preload: contextualize(preload),
			postload: contextualize(postload),
			load: contextualize(load),
			limit: contextualize(limit),
			throttle: contextualize(throttle),
			debounce: contextualize(debounce),
			repeat: contextualize(repeat),
			createWrapper: contextualize(createWrapper)
		}
	);

})();
function isEven(number) {

	number = +number;

	// Return false if the number is not an integer.
	// TODO: Make isInteger and isFinite available in scope.
	// TODO: Coerce to int instead of check below?
	if (!isInteger(number)
		|| !isFinite(number))
		return false;

	return !(number % 2);

}

function isOdd(number) {

	number = +number;

	// Return false if the number is not an integer.
	if (!isInteger(number)
		|| !isFinite(number))
		return false;

	return !!(number % 2);

}

function sign(number) {
	// TODO: NaN currently returns 1. Does this make sense? Should it return 0??
	number = +number;
	return number == 0 && (1 / number < 0 ? -1 : 1)
		|| (number < 0 ? -1 : 1);
}

var _Number = (function() {

	return methods(

		Number,

		// Constructor methods
		null,

		// Instance methods
		{
			isEven: contextualize(isEven),
			isOdd: contextualize(isOdd),
			sign: contextualize(sign)
		}

	);

})();
// TODO: Use Spawn.mixin?
function mixin(what/*, ...withs */) {

	if (Object(what) != what)
		throw new TypeError('Cannot call mixin on a non-object: ' + what);

	if (!isExtensible(what))
		throw new Error('Cannot call mixin on a non-exensible object');

	var withO;

	for (var i = 1; i < arguments.length; i++) {

		withO = Object(arguments[i]);

		forEach(getUncommonPropertyNames(withO, what), function(name) {

			var whatDesc = getPropertyDescriptor(what, name),
				withDesc = getPropertyDescriptor(withO, name);

			if (!whatDesc || whatDesc.configurable)
				// If what does not already have the property, or if what
				// has the property and it's configurable, add it as is.
				defineProperty(what, name, withDesc);

		});
	}

	return what;

}

function copy(what/*, ...withs */) {
	// Performs a simple shallow copy intended specifically for objects.
	// For a generic deep clone, use clone.

	if (Object(what) != what)
		throw new TypeError('Cannot copy a non-object:' + what);

	// This algorithm simply creates a new object with the same prototype and then mixes in the own properties.
	// It will also mixin any uncommon properties from other arguments.
	return apply(mixin, null, concat([ create(getPrototypeOf(what)), what ], slice(arguments, 1)));

}

// We only want to define with own properties of the descriptor.
function defineProperty(obj, name, desc) {
	return _defineProperty(obj, name, own(desc));
}

var _Object = (function() {

	return methods(

		Object,

		// Static methods
		null,

		// Instance methods
		{

			define: contextualize(defineProperty),

			mixin: contextualize(mixin),
			copy: contextualize(copy),

			// DEPRECATED temporarily. TODO: evaluate whether to keep this algorithm and all the nuances of it.
			// clone: (function() {
			// 	// Performs a deep clone. For a shallow copy, use either the copy method or Object.create.
			// 	// In order to permit objects to define a self cloning method which is utilized by this clone function,
			// 	// there are two steps that must be taken: (1) Define clone.$selfClone with a property name or Symbol
			// 	// (if Symbols are available) which can be used to retrieve the clone method. (2) Define the self cloning
			// 	// method on each object which can self clone using the same property name or symbol.

			// 	var $selfClone,

			// 		clone = function clone() {
			// 			$selfClone = clone.$selfClone;
			// 			return structuredClone(this, [ ]);
			// 		},

			// 		structuredClone = function structuredClone(input, memory) {
			// 			// This algorithm is loosely based on the HTML5 internal structured cloning algorithm, but there are
			// 			// some slight deviations.
			// 			// http://www.w3.org/TR/html5/common-dom-interfaces.html#safe-passing-of-structured-data
			// 			// TODO: It may be worthwhile to reevaluate whether there should be deviations in the algorithm or not.

			// 			var pair, output, selfClone;

			// 			if (
			// 				memory.some(function(u) {
			// 					var pair = u;
			// 					return input === pair.source;
			// 				})
			// 			) return pair.destination;

			// 			if (typeof input != 'object' || input === null)
			// 				return input;

			// 			switch(Objects.getTagOf(input)) {

			// 				case 'Boolean':		output = new Boolean(input.valueOf()); break;
			// 				case 'Number':		output = new Number(input.valueOf()); break;
			// 				case 'String':		output = new String(input.toString()); break;
			// 				case 'Date':		output = new Date(input.getTime()); break;
			// 				case 'RegExp':		output = new RegExp(input.toString()); break;
			// 				// case File: break;
			// 				// case Blob: break;
			// 				// case FileList: break;
			// 				case 'Array':		output = new Array(input.length); break;
			// 				//case TypedArray: break;

			// 				case 'Function':
			// 					throw new DataCloneError('Functions cannot be cloned.');

			// 				case 'Object':
			// 				case 'Error':
			// 				case 'Math':
			// 				default:
			// 					// This currently deviates from the internal structured cloning algorithm specification.
			// 					// To follow the standard, it should just be: output = new Object(); break;

			// 					// An object can define its own clone method.
			// 					if ($selfClone && (selfClone = input[$selfClone]) && typeof selfClone == 'function') {
			// 						output = selfClone.call(input);
			// 						// If the object cloned itself, it should take care of copying over the correct own
			// 						// properties as well. We leave that up to the object to do internally.
			// 						return output;
			// 					}

			// 					// If input has a cloneNode method, use it.
			// 					// Unfortunately, this assumes anything with a "cloneNode" method (and other duck-type
			// 					// constraints, such as the "nodeType" property) wants to be cloned using that method,
			// 					// which may not be the case. For better integrity, the [[Class]] of input could be
			// 					// checked against known HTML/XML DOM Nodes. However, the list of possible [[Class]]
			// 					// values would be rather large and may not be able to be exhaustive. I'm unsure if
			// 					// there is a better approach. Checking instanceof Node is no good because we have to
			// 					// support nodes from other frames.
			// 					else if ('nodeType' in input
			// 							&& 'ownerDocument' in input
			// 							&& typeof input.cloneNode == 'function'
			// 						) output = input.cloneNode(true);

			// 					// Create an object with the same prototype as input.
			// 					else output = Object.create(Object.getPrototypeOf(input));

			// 					break;

			// 			}

			// 			memory.push({
			// 				source: input,
			// 				destination: output
			// 			});

			// 			Object.getOwnPropertyNames(input).forEach(function(key) {

			// 				var inputDesc = Object.getOwnPropertyDescriptor(input, key),
			// 					clonedPropertyValue;

			// 				if (inputDesc.value) {
			// 					// Clone the property value for a deep clone.
			// 					clonedPropertyValue = structuredClone(inputDesc.value, memory);
			// 					Object.defineProperty(output, key, {
			// 						value: clonedPropertyValue,
			// 						enumerable: inputDesc.enumerable,
			// 						writable: inputDesc.writable,
			// 						configurable: inputDesc.configurable
			// 					});
			// 				} else {
			// 					// For getters and setters we just copy over the descriptor. We expect getters and setters
			// 					// to be smart enough to work with their given context to produce reasonable values in the
			// 					// event that they are copied to other objects.
			// 					Object.defineProperty(output, key, inputDesc);
			// 				}

			// 			});

			// 			return output;

			// 		};

			// 	return clone;

			// })()

		}

	);

})();
function isTagged(obj, tag) {
	var proto;
	return tag === getTagOf(obj)
		|| (Object(obj) === obj
			&& (proto = getPrototypeOf(obj))
			&& isTagged(proto, tag));
}

function isLike(obj, tag) {
	var proto,
		O = Object(obj),
		objTag = replace(getTagOf(O), /^~+/, '');
	tag = replace(tag, /^~+/, '');
	return !!(tag == objTag
		// We say that an arguments object is like an array.
		|| tag == 'Array' && objTag == 'Arguments'
		|| (O === obj
			&& (proto = getPrototypeOf(obj))
			&& isTagged(proto, tag)));
}

function getTypeOf(obj) {
	// Like typeof, except we add "null" and "array" returns.
	// Note that "array" is returned for objects tagged as "~Array", not only true arrays.

	if (obj === null)
		return 'null';

	// We only check isLike for Array it is already an object.
	// We don't check isLike('Boolean') and then return 'boolean' because if it's a
	// Boolean object we still want to return 'object'.
	// We don't check isLike('Function') because something can inherit from Function
	// but not be callable, and we want to maintain that getTypeOf(f) == 'function'
	// ensures that f is callable.
	if (isLike(obj, 'Array'))
		return 'array';

	return typeof obj;

}

function getTagOf(obj) {
	return StringSlice(ToString(obj), 8, -1);
}

// TODO: Rename `dict`? Is this identical to ES6 `dict`?
function own(obj) {
	// Note: This function is not guaranteed to return a new object. It will return the object passed in
	// if it has no prototype. This could cause confusion if it is forgotten and it is assumed to create
	// a new object unconditionally. The current behavior is for performance reasons to prevent unnecessary
	// object allocations.
	// TODO: Consider whether this is a reasonable trade-off.

	if (obj == null || getPrototypeOf(obj) == null)
		return obj;

	var O = Object(obj),
		ret = create(null);

	_forEach(getOwnPropertyNames(O), function(key) {
		_defineProperty(ret, key,
			_getOwnPropertyDescriptor(O, key));
	});

	return ret;

}

function getUncommonPropertyNames(from, compareWith) {
	if (Object(from) !== from || Object(compareWith) !== compareWith)
		throw new TypeError('getUncommonPropertyNames called on non-object.');
	var namesMap = create(null);
	return filter(_concatUncommonNames(from, compareWith),
		function(u) {
			if (namesMap[u]) return false;
			return namesMap[u] = true;
		});
};

function _concatUncommonNames(from, compareWith) {
	if (Object(from) != from
		|| from === compareWith
		|| isPrototypeOf(from, compareWith)) return [ ];
	return concat(getOwnPropertyNames(from), 
		_concatUncommonNames(getPrototypeOf(from), compareWith));
}

// We want to make sure that only own properties of the descriptor are returned,
// so that we can't be tricked.
function getOwnPropertyDescriptor(obj, name) {
	return own(_getOwnPropertyDescriptor(obj, name));
}

function getPropertyDescriptor(obj, name) {
	var proto;
	if (Object(obj) !== obj)
		throw new TypeError('getPropertyDescriptor called on non-object.');
	if (hasOwn(obj, name))
		return getOwnPropertyDescriptor(obj, name);
	else if (proto = getPrototypeOf(obj))
		return getPropertyDescriptor(proto, name);
}

function _items(obj) {
	var items = [ ];
	for (var key in obj)
		push(items, [ key, obj[key] ]);
	return items;
}

function _values(obj) {
	var values = [ ];
	forEach(keys(obj), function(key) {
			push(values, obj[key]);
		});
	return values;
}

function ReflectGetItems(obj) {
	var I = obj.items;
	if (typeof I == 'function')
		return call(I, obj);
	return ArrayIterator(_items(obj));
}

function ReflectGetKeys(obj) {
	var K = obj.keys;
	if (typeof K == 'function')
		return call(K, obj);
	return ArrayIterator(keys(obj));
}

function ReflectGetValues(obj) {
	var V = obj.values;
	if (typeof V == 'function')
		return call(V, obj);
	return ArrayIterator(_values(obj));
}

var _Reflect = own({
	isPrototypeOf: isPrototypeOf,
	hasOwn: hasOwn,
	getTypeOf: getTypeOf,
	getTagOf: getTagOf,
	isTagged: isTagged,
	isLike: isLike,
	own: own,
	getUncommonPropertyNames: getUncommonPropertyNames,
	// TODO: Is getOwnPropertyDescriptor going to de in ES6 Reflect? If so this needs to be renamed. (It should maybe be renamed any way.)
	getOwnDescriptor: getOwnPropertyDescriptor,
	getDescriptor: getPropertyDescriptor,
	getItems: ReflectGetItems,
	getKeys: ReflectGetKeys,
	getValues: ReflectGetValues
});
function SetAddAll(set, iterable) {

	if (set == null)
		throw new TypeError('addAll cannot be called on null or undefined.');

	var O = Object(set),
		adder = O.add;

	if (typeof adder != 'function')
		throw new Error('Object has no add method.');

	if (!isIterable(iterable))
		throw new TypeError('Iterable argument expected.');

	forEach(iterable, function(value) {
		call(adder, O, value);
	});

}

// Although this method is intended for Sets and difficult to generalize, technically it only
// requires that the objects be iterable.
function intersect(a, b) {

	if (a == null || b == null)
		throw new TypeError('intersect cannot be called on null or undefined.');

	var A = Object(a), B = Object(b),
		checkIn, checkAgainst;

	if (!isIterable(A) || !isIterable(B))
		throw new TypeError('Iterable argument expected.');

	if (!(A instanceof Set))
		A = new Set(ToIterable(A));

	if (!(B instanceof Set))
		B = new Set(ToIterable(B));

	if (A.size < B.size) {
		checkIn = A;
		checkAgainst = B;
	} else {
		checkIn = B;
		checkAgainst = A;
	}

	return filter(checkIn, function(value) {
		return SetContains(checkAgainst, value);
	});

}

// Although this method is intended for Sets and difficult to generalize, technically it only
// requires that the objects be iterable.
function unite(a, b) {

	if (a == null || b == null)
		throw new TypeError('unite cannot be called on null or undefined.');

	var A = Object(a), B = Object(b),
		result = new Set();

	if (!isIterable(A) || !isIterable(B))
		throw new TypeError('Iterable argument expected.');

	if (!(A instanceof Set))
		A = new Set(ToIterable(A));

	if (!(B instanceof Set))
		B = new Set(ToIterable(B));

	SetAddAll(result, A);
	SetAddAll(result, B);

	return result;

}

// Although this method is intended for Sets and difficult to generalize, technically it only
// requires that the objects be iterable.
function subtract(a, b) {

	if (a == null || b == null)
		throw new TypeError('unite cannot be called on null or undefined.');

	var A = Object(a), B = Object(b);

	if (!isIterable(A) || !isIterable(B))
		throw new TypeError('Iterable argument expected.');

	if (!(A instanceof Set))
		A = new Set(ToIterable(A));

	if (!(B instanceof Set))
		B = new Set(ToIterable(B));

	return filter(A, function(value) {
		return !SetContains(B, value);
	});

}

function isSubsetOf(a, b) {

	if (a == null || b == null)
		throw new TypeError('unite cannot be called on null or undefined.');

	var A = Object(a), B = Object(b);

	if (!isIterable(A) || !isIterable(B))
		throw new TypeError('Iterable argument expected.');

	if (!(A instanceof Set))
		A = new Set(ToIterable(A));

	if (!(B instanceof Set))
		B = new Set(ToIterable(B));

	return !some(A, function(value) {
		return !SetContains(B, value);
	});

}

var _Set = methods(

	Set,

	// Static methods
	null,

	// Instance methods
	{
		addAll: contextualize(SetAddAll),
		intersect: contextualize(intersect),
		unite: contextualize(unite),
		subtract: contextualize(subtract),
		isSubsetOf: contextualize(isSubsetOf)
	}

);
$Candy(Map.prototype).construct = function(array) {
	return new Map(array);
};
$Candy(Set.prototype).construct = function(array) {
	return new Set(array);
};
$Candy(WeakMap).construct = function(array) {
	return new WeakMap(array);
};

	var modules = (function() {
			var _modules = [
					{
						name: 'Object',
						module: _Object,
							 // name: built-in
						coat: { Object: Object }
					},
					{
						name: 'Iterable',
						module: Iterable,
						coat: {
							Array: Array,
							Map: Map,
							Set: Set
							// ? String: String
						}
					},
					{
						name: 'Array',
						module: _Array,
						coat: { Array: Array }
					},
					{
						name: 'Function',
						module: _Function,
						coat: { Function: Function }
					},
					// {
					// 	name: 'Map',
					// 	module: _Map,
					// 	coat: { Map: Map }
					// },
					{
						name: 'Number',
						module: _Number,
						coat: { Number: Number }
					},
					{
						name: 'Set',
						module: _Set,
						coat: { Set: Set }
					},
					// {
					// 	name: 'WeakMap',
					// 	module: _WeakMap,
					// 	coat: { WeakMap: WeakMap }
					// },
					{
						name: 'Reflect',
						module: _Reflect,
						coat: { Reflect: Reflect }
					}
				];
			return map(_modules,
				function(def) {
					var name = def.name,
						ret = create(null);
					ret.name = name;
					ret.module = def.module;
					// TODO: all and any functions
					ret.test = preload(all, map(keys(def.coat),
						function(name) { return postload(isLike, name); }));
					ret.builtIns = map(keys(def.coat),
						function(name) { return def.coat[name]; });
					return ret;
				}
			);
		})(),

		candy = {

			$$: $$,

			// We use a generic slice which can distinguish between strings and array-like objects.
			slice: slice,

			coat: (function () {

				return function coat(obj/*, override, module */) {

					if (obj == null)
						throw new TypeError('Cannot coat null or undefined');

					var O = Object(obj),
						override = !!arguments[1],
						module = arguments[2];
						M = M !== undefined ? String(M) : undefined;

					if (!override && $Candy(O).coated)
						return;

					if (!isExtensible(O))
						throw new Error('Object is not extensible.');

					$Candy(O).coated = true;

					var error;

					forEach(modules, function(info) {
						var name = info.name,
							module = info.module,
							test = info.test;
						if (M === name || test(O))
							forEach(getOwnPropertyNames(module.instance), function(name) {

								var oDesc = getPropertyDescriptor(O, name);

								if (override && !oDesc.configurable) {
									if (!error)
										error = new Error('Property is not configurable: ' + name);
									return;
								}

								if (!oDesc || override && oDesc.configurable)
									defineProperty(O, name,
										getOwnPropertyDescriptor(module.instance, name));

							});
					});

					if (error)
						throw error;

					return O;

				};

			})(),

			coatBuiltIns: (function() {

				var coated = false;

				return function coatBuiltIns(/* override */) {

					var override = !!arguments[0];

					if (!override && coated)
						return;

					coated = true;

					forEach(modules, function(info) {

						var name = info.name,
							module = info.module,
							builtIns = info.builtIns,
							error;

						forEach(
							[
								{ with: module, what: builtIns },
								{ with: module.instance, what: map(builtIns, function(builtIn) { return builtIn.prototype; }) }
							],
							function(info) {

								var coatWith = info.with,
									coatWhat = info.what;

								getOwnPropertyNames(coatWith).forEach(function(name) {
									
									forEach(coatWhat, function(what) {

										if (!isExtensible(what)) {
											if (!error)
												error = new Error('Built-in is not extensible.');
											return;
										}

										if (name == 'instance')
											return;

										var bDesc = getPropertyDescriptor(what, name);

										if (override && !bDesc.configurable) {
											if (!error)
												error = new Error('Property is not configurable: ' + name);
											return;
										}

										if (!bDesc || override)
											defineProperty(what, name,
												getOwnPropertyDescriptor(coatWith, name));

									});

								});


							}
						);
	
						if (error)
							throw error;

					});

				};

			})()

		};

	forEach(modules, function(info) {
		var name = info.name,
			module = candy[name] = info.module;
		forEach(getOwnPropertyNames(module), function(name) {
			var desc = getOwnPropertyDescriptor(module, name);
			if (!hasOwn(candy, name))
				defineProperty(candy, name, desc);
		});
	});

	return candy;

})(
	(function() {
		var exports = Object.create(null);
		
		
		return {
			createSecret: createSecret,
			$$: exports.$$ || (typeof $$ != 'undefined' ? $$ : undefined)
		};
	})(),
	Object, Array, Function, String, Number, TypeError, RangeError, Error, WeakMap, Map, Set, Reflect
);

// exports
if (typeof module == 'object' && module != null
	&& typeof module.exports == 'object' && module.exports != null)
	module.exports = candy;;
			var Unit = (function() {

	var Unit = Spawn.beget();

	$$(Unit, 'toStringTag', 'Unit');

	return Unit;

})();

// exports
if (typeof module == 'object' && module != null
	&& typeof module.exports == 'object' && module.exports != null)
	module.exports = Unit;;
			return { Unit: Unit, candy: candy, $$: $$ };
		})(),
		Unit = __exports__.Unit,
		candy = __exports__.candy,
		$$ = __exports__.$$,

		beget = Spawn.beget,

		lazyBind = candy.Function.lazyBind,
		bind = candy.Function.bind,
		call = candy.Function.call,
		apply = candy.Function.apply,
		spread = candy.Function.spread,
		bind = candy.Function.bind,
		preload = candy.Function.preload,
		defer = candy.Function.defer,
		limit = candy.Function.limit,

		ArrayFrom = Array.from,
		ArraySlice = candy.Array.slice,
		ArraySome = candy.Array.some,
		splice = candy.Array.splice,
		push = candy.Array.push,
		isArrayLike = candy.Array.isArrayLike,
		toTruthTable = candy.Array.toTruthTable,
		without = candy.Array.without,

		sign = candy.Number.sign,

		define = candy.Object.define,

		getTypeOf = candy.Reflect.getTypeOf,
		getTagOf = candy.Reflect.getTagOf,
		isLike = candy.Reflect.isLike,
		//getItems = candy.Reflect.getItems,
		own = candy.Reflect.own,

		forEach = candy.Iterable.forEach,
		some = candy.Iterable.some,
		map = candy.Iterable.map,

		create = Object.create,
		keys = Object.keys,
		getOwnPropertyNames = Object.getOwnPropertyNames,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,

		toInt = Number.toInt,
		
		abs = Math.abs,

		// From Reflect module. TODO: Will this be global in ES6?
		has = Reflect.has,
		hasOwn = Reflect.hasOwn,
		deleteProperty = Reflect.deleteProperty,

		// These functions are assigned by Contract to be shared with Contracter.
		ObligationFulfill,
		ObligationFail,
		ObligationWhen,
		PromiseAbort,
		PromiseWhen,
		PromiseAddListener,
		PromiseGetState,

		NO_ERROR = { },

		CONTRACT_STATES = [ 'pending', 'fulfilled', 'failed', 'aborted' ],
		CONTRACT_PSEUDO_STATES = own({
			'done': [ 'fulfilled', 'failed', 'aborted' ]
		});

	var Handler = (function() {

	var Base = Unit,
		$ = createSecret();

	return classify('Handler', Base, {

		construct: function construct(params) {

			if (this == null)
				throw new TypeError('Cannot call `construct` on null or undefined.');

			var O = Object(this);

			if (params == null)
				throw new TypeError('Params expected.');

			var onOff;

			if (typeof params == 'function')
				onOff = params;
			else {
				onOff = Object(params).onOff;
				if (typeof onOff != 'function')
					throw new TypeError('Expected "onOff" param.');
			}

			$(O).onOff = onOff;

		},

		off: function off() {

			if (this == null)
				throw new TypeError('Cannot call `off` on null or undefined.');

			var O = Object(this),
				onOff = $(O).onOff;

			if (!onOff)
				throw new TypeError('Handler expected.');

			onOff();

		}

	});

})();
var PromiseManager = (function() {

	var Base = Unit,
		ALL = -0,

		validStates = toTruthTable(CONTRACT_STATES);

	return classify('PromiseManager', Base, { 

		manage: manage,

		all: function all(promises/*, states = [ 'fulfilled' ] */) {
			return manage({
				promises: promises,
				states: arguments[1],
				count: ALL,
				maintainOrder: true,
				abortLosers: false,
				abortOnFailure: false
			});
		},

		some: function some(promises/*, states = [ 'fulfilled' ], count = 1 */) {
			var states = arguments[1],
				count = arguments[2];
			if (typeof states == 'number') {
				count = states;
				states = undefined;
			}
			return manage({
				promises: promises,
				states: arguments[1],
				count: arguments[2] === undefined ? 1 : arguments[2],
				maintainOrder: false,
				abortLosers: false,
				abortOnFailure: false
			});
		},

		any: function any(promises/*, states = [ 'fulfilled' ] */) {
			return manage({
				promises: promises,
				states: arguments[1],
				count: 1,
				maintainOrder: false,
				abortLosers: false,
				abortOnFailure: false
			}).get(0);
		}

		// only: function only(promises/*, states = [ 'fulfilled' ], count = 1 */) {
		// 	return manage({
		// 		promises: promises,
		// 		states: arguments[1],
		// 		count: arguments[2] === undefined ? 1 : arguments[2],
		// 		maintainOrder: false,
		// 		abortLosers: true,
		// 		abortOnFailure: false
		// 	});
		// },

		// TODO: Do the below make sense? Or should they be set up another way? Such as `new PromiseArray(...).forEach(...)`

		// forEach: function forEach(promises/*, states = [ 'fulfilled' ], callback */, $2) {

		// },

		// map: function map(promises/*, states = [ 'fulfilled' ], callback */, $2) {

		// }

	});

	function manage(params) {
		// TODO: What should be the failure reason for the returned promise if it's failed?

		params = own(params);

		var contract = CreateContract({ description: 'PromiseManager' }),
			promises = params.promises,
			promisesLength,
			states = params.states, // OR logic will be used between multiple states.
			statesLength,
			count = params.count,
			maintainOrder = !!params.maintainOrder,
			abortLosers = !!params.abortLosers,
			abortOnFailure = !!params.abortOnFailure,
			resolutionValues = createSack(),
			resolvedPro = 0,
			resolvedTotal = 0,
			proStates = create(null), // A map of states which are acceptable.
			handlers = createSack();

		if (!isArrayLike(promises))
			throw new TypeError('Array-like object expected.');

		promises = SackFrom(promises);
		promisesLength = promises.length >>> 0;

		if (states === undefined) {
			statesLength = 1;
			proStates.fulfilled = true;
		} else if (isArrayLike(states)) {
			statesLength = states.length >>> 0;
			forEach(states, function(state) {
				state = String(state);
				if (!validStates[state])
					throw new TypeError('Invalid state: "' + state + '"');
				proStates[state] = true;
			});
		} else {
			states = String(states);
			statesLength = 1;
			if (!validStates[states])
				throw new TypeError('Invalid state: "' + states + '"');
			proStates[states] = true;
		}

		if (count === undefined)
			count = 1;

		count = toInt(count);

		if (sign(count) == -1)
			count = promisesLength + count;

		if (count < 0)
			count = 0;

		// TODO: Think about what count: 0 means.
		// TODO: Think about NOT logic. What if we wanted to say "fulfill only if 0 are failed"?
		if (promisesLength == 0/* TODO: || is(count, +0)? -- NOTE: The +0/-0 difference now gets taken care of above this line. */) {
			if (count == 0) // 0 or ALL
				ObligationFulfill(contract.obligation, [ ]);
			else
				ObligationFail(contract.obligation);
		} else {
			// We use a for loop here intentionally instead of forEach so that we can use `promisesLength`
			// and avoid any hokey getter weirdness on promises.length.
			for (var index = 0, promise; index < promisesLength; index++) {
				promise = promises[index];
				if (isLike(promise, 'Contract'))
					// TODO: Have an internal way to access the promise from a contract even if the property has been deleted or changed?
					promise = promise.promise;
				// TODO: Change to instanceof check? This can only work on an instanceof Promise anyway because
				// of the use of lazyBound methods like PromiseGetState. Maybe instead those should be genericized
				// in some way? I need to spend some more time thinking over these issues. (Is cross-frame possible with integrity?)
				if (!isLike(promise, 'Promise'))
					throw new TypeError('Promise expected.');
				if (proStates.pending
					&& (statesLength == 1 || PromiseGetState(promise) == 'pending'))
					finishedPromise(promise, index, undefined);
				else
					push(handlers,
						PromiseAddListener(promise, 'done', preload(finishedPromise, promise, index)).handler);
			}
		}

		return contract.promise;

		function finishedPromise(promise, index, value) {

			if (resolutionValues == null)
				return;

			resolvedTotal++;

			if (proStates[PromiseGetState(promise)]) {
				resolvedPro++;
				if (maintainOrder) {
					resolutionValues[index] = value;
					if (resolutionValues.length < index + 1)
						resolutionValues.length = index + 1;
				} else
					push(resolutionValues, value);
			}

			if (resolvedPro >= count) {
				if (abortLosers)
					// TODO: Use a special kind of forEach which only passes in the iterated arg.
					forEach(promises, function(promise) {
						PromiseAbort(promise, 'Lost race.');
					});
				ObligationFulfill(contract.obligation, ArrayFrom(resolutionValues));
				cleanup();
			} else if (resolvedTotal - resolvedPro + count > promisesLength) {
				if (abortOnFailure)
					forEach(promises, function(promise) {
						PromiseAbort(promise, 'Race failed.');
					});
				ObligationFail(contract.obligation);
				cleanup();
			}

		}

		function cleanup() {
			resolutionValues = null;
			// TODO: Use a special kind of forEach which only passes in the iterated arg.
			forEach(handlers, function(handler) {
				HandlerOff(handler);
			});
		}

	}

})();
// TODO: Allow pseudo-states to be defined which map to multiple states, such as "done".
var StateSwitcher = (function() {

	var Base = Unit,
		$ = createSecret(),
		$H = createSecret(),

		methods = {

			/**
			 * @param {Array} states An array of strings to specify the states for the StateSwitcher.
			 * @param {string} initialState A string specifying the initial state.
			 * @param {boolean} persistCallbacks=true Determines whether to keep callbacks persistent.
			 * @param {number} switchLimit=Infinity How many switches to permit.
			 */
			construct: function construct(params) {

				if (params == null)
					throw new TypeError('A StateSwitcher cannot be constructed without a params object.');

				if (!('states' in params))
					throw new TypeError('StateSwitcher requires the "states" param.');

				if (!('initialState' in params))
					throw new TypeError('StateSwitcher requires the "initialState" param.');

				if (this == null)
					throw new TypeError('Cannot call construct on null or undefined.');

				var O = Object(this),
					$O = $(O),
					BaseConstruct = Base.construct,
					PC = 'persistCallbacks' in params ? params.persistCallbacks : true,
					SL = 'switchLimit' in params ? params.switchLimit : Infinity,
					PS = params.pseudoStates;

				if (typeof BaseConstruct == 'function')
					call(BaseConstruct, O, params);

				$O.isStateSwitcher = true;
				$O.validStates = toTruthTable(params.states);
				$O.pseudoStates = PS == null ? null : solidifyPseudoStates(PS);
				$O.callbackMap = create(null); // TODO: Start using a library `dict()` function instead of `create(null)` in these situations, so that when ES6 is implemented, we can take advantage of engine optimization possiblities with ES6 dict().
				$O.persistCallbacks = !!PC;
				$O.switchesRemaining = SL === Infinity ? Infinity : SL >>> 0;

				call(methods.switch, O, params.initialState);

				return O;

			},

			/**
			 * Returns `true` if the state switches successfully, `false` otherwise.
			 */
			switch: function switch_(state) {

				if (this == null)
					throw new TypeError('Cannot call switch on null or undefined.');

				var O = Object(this),
					$O = $(O),
					validStates = $O.validStates;

				if (!$O.isStateSwitcher)
					throw new TypeError('Object has no defined states.');

				if (!$O.switchesRemaining)
					return false;

				state = String(state);

				if (!validStates[state])
					throw new TypeError('Invalid state "' + state + '".');

				$O.state = state;

				var callbackMap = $O.callbackMap,
					callbacks = callbackMap[state];

				if (!--$O.switchesRemaining) {
					delete $O.validStates;
					delete $O.callbackMap;
				} else if (!$O.persistCallbacks)
					delete callbackMap[state];

				if (callbacks)
					defer(bind(callAll, null, callbacks));

				return true;

			},

			addListener: preload(addListener, true),
			when: preload(addListener, false),

			getState: function getState() {

				if (this == null)
					throw new TypeError('Cannot call getState on null or undefined.');

				var O = Object(this),
					$O = $(O),
					state = $O.state;

				if (!$O.isStateSwitcher)
					throw new TypeError('Object has no defined states.');

				return state;

			}

		};

	function callAll(callbacks) {

		var error;

		forEach(callbacks, function(callback) {
			try {
				callback();
			} catch(x) {
				if (error === undefined)
					error = x;
			}
		});

		if (error)
			throw error;

	}

	function addListener(handler, map/* | state(s), callback(s) */) {

		if (this == null)
			throw new TypeError('Cannot call on null or undefined.');

		var O = Object(this),
			$O = $(O),
			validStates = $O.validStates,
			pseudoStates = $O.pseudoStates,
			callbackMap = $O.callbackMap;

		if (!$O.isStateSwitcher)
			throw new TypeError('Object has no defined states.');

		if (handler === true) {
			handler = CreateHandler(function() {
				if (!handler)
					return;
				forEach($H(handler).callbacks, function(info) {
					var mapCallbacks = ArrayFrom(callbackMap[info.state]);
					if (mapCallbacks)
						// Note: ArraySome has to be used here (for now) so that we can get the index. (Currently candy.Iterable.some does not pass in the index to the callback function, though this may change.)
						ArraySome(mapCallbacks, function(mapCallback, i) {
							if (info.callback === mapCallback) {
								splice(mapCallbacks, i, 1);
								return true;
							}
						});
				});
				handler = null;
			});
			$H(handler).callbacks = createSack();
		} else if (handler === false)
			handler = undefined;

		if (map && typeof map == 'object') {
			// We only iterate own properties to provide convenience.
			// eg: when({ ... }) without having to worry about a compromised Object.prototype.
			forEach(keys(map), function(key) {
				call(addListener, O, handler, key, map[key]);
			});
			return handler;
		}

		var state = arguments[1],
			callback = arguments[2];

		if (isArrayLike(state)) {
			forEach(state, function(u) {
				call(addListener, O, handler, String(u), callback);
			});
			return handler;
		}

		if (isArrayLike(callback)) {
			forEach(callback, function(u) {
				if (typeof u != 'function')
					throw new TypeError('Function expected in callbacks array.');
				call(addListener, O, handler, state, u);
			});
			return handler;
		}

		state = String(state);

		if (!validStates[state]) {
			if (pseudoStates[state]) {
				forEach(pseudoStates[state], function(u) {
					call(addListener, O, handler, u, callback);
				});
				return handler;
			} else
				throw new TypeError('Invalid state "' + state + '".');
		}

		if (typeof callback != 'function')
			throw new TypeError('Function expected for callback argument.');

		var sameState = state == $O.state;

		if (sameState)
			defer(callback);
		
		if ((!sameState || $O.persistCallbacks) && $O.switchesRemaining) {
			push(callbackMap[state] || (callbackMap[state] = createSack()), callback);
			if (handler)
				push($H(handler).callbacks, {
					state: state,
					callback: callback
				});
		}

		if (handler)
			return handler;

	}

	function solidifyPseudoStates(pseudoStates) {
		var PS = create(null);
		forEach(getOwnPropertyNames(pseudoStates), function(pseudoState) {
			var states = pseudoStates[pseudoState],
				solidifiedStates;
			if (states != null)
				solidifiedStates = ArrayFrom(states);
			if (solidifiedStates && solidifiedStates.length > 0)
				PS[pseudoState] = solidifiedStates;
		});
		return PS;
	}

	return classify('StateSwitcher', Base, methods);

})();
var Contract = (function() {

	var Obligation = (function() {

	var Base = Unit,
		$ = createSecret(),
		_fulfill = preload(ContractPartResolve, $, 'fulfilled'),
		Fulfill = lazyBind(_fulfill),
		_fail = preload(ContractPartResolve, $, 'failed'),
		Fail = lazyBind(_fail),
		_when = preload(ContractPartAddListener, $, false),
		When = lazyBind(_when);

	return classify('Obligation', Base, {

			construct: preload(ContractPartConstruct, $, [ 'fulfilled', 'failed' ]),

			get state() { return call(ContractGetState, this, $); },
			get value() { return call(ContractGetValue, this, $); },

			fulfill: _fulfill,
			fail: _fail,

			addListener: preload(ContractPartAddListener, $, true),
			when: _when,

			link: function link(promise) {
				if (this == null)
					throw new TypeError('Cannot call link on null or undefined.');
				if (promise == null)
					throw new TypeError('Cannot call link with null or undefined.');
				var O = Object(this),
					P = Object(promise);
				PromiseWhen(promise, own({
					fulfilled: function(value) {
						Fulfill(O, value);
					},
					failed: function(reason) {
						Fail(O, reason);
					}
					// We ignore an abort. (It's possible an obligation could be linked to 2 or more promises, in which case
					// we may want to wait on antoher one to be resolved if the first is aborted.) TODO: Is this the correct response?
				}));
				// Note: I was using the following pattern of retrieving `when` from the promise.
				// I feel like there might have been a compelling reason to do this, but I don't
				// remember why, and am converting it to use PromiseWhen for now.
				// TODO: Rethink these issues and decide whether to keep using PromiseWhen or revert
				// to using P.when.
				// var when = P.when;
				// if (typeof when != 'function')
				// 	throw new TypeError('when method expected on object.');
				// call(when, promise, {
				// 	fulfilled: function(value) {
				// 		Fulfill(O, value);
				// 	},
				// 	failed: function(reason) {
				// 		Fail(O, reason);
				// 	}
				// 	// We ignore an abort. (It's possible an obligation could be linked to 2 or more promises, in which case
				// 	// we may want to wait on antoher one to be resolved if the first is aborted.) TODO: Is this the correct response?
				// });
			}

		});

})();
var Promise = (function() {
	
	var Base = Unit,
		$ = createSecret(),
		Then = lazyBind(preload(ContractPartAddListener, $, false, 'fulfilled')),
		Fulfill = lazyBind(Obligation.fulfill),
		Fail = lazyBind(Obligation.fail),
		_when = preload(ContractPartAddListener, $, false),
		When = lazyBind(_when);

	return classify('Promise', Base, {

			construct: preload(ContractPartConstruct, $, [ 'aborted' ]),

			get state() { return call(ContractGetState, this, $); },
			get value() { return call(ContractGetValue, this, $); },

			abort: preload(ContractPartResolve, $, 'aborted'),

			addListener: preload(ContractPartAddListener, $, true),
			when: _when,

			then: function then(whenFulfilled, whenFailed) {

				if (this == null)
					throw new TypeError('then cannot be called on null or undefined.');

				return When(this, own({
					fulfilled: whenFulfilled,
					failed: whenFailed
				}));

			},

			get: function get(key) {
				return Then(this, function(v, next) {
					Fulfill(next, v[key]);
				});
			},

			set: function set(key, value) {
				return Then(this, function(v, next) {
					Fulfill(next, v[key] = value);
				});
			},

			has: function has(key) {
				return Then(this, function(v, next) {
					Fulfill(next, has(v, key));
				});
			},

			hasOwn: function hasOwn(key) {
				return Then(this, function(v, next) {
					Fulfill(next, hasOwn(v, key));
				});
			},

			delete: function delete_(key) {
				return Then(this, function(v, next) {
					Fulfill(next, deleteProperty(v, key));
				});
			},

			// Array methods

			spreadTo: function spreadTo(f) {

				if (typeof f != 'function')
					throw new TypeError('Function expected.');

				return Then(this, function(v, next) {
					Fulfill(next, apply(f, null, v));
				});

			},

			// Function methods

			call: function call(thisArg/*, ...args */) {
				var args = ArraySlice(arguments, 1);
				return Then(this, function(v, next) {
					Fulfill(next, apply(v, thisArg, args));
				});
			},

			apply: function apply(thisArg, args) {
				var tag = getTagOf(args);
				// TODO: Should the following throw happen? It could accept any object..
				if (tag != 'Arguments' && tag != 'Array')
					throw new TypeError('Array or arguments object expected.');
				return Then(this, function(v, next) {
					Fulfill(next, apply(v, thisArg, args));
				});
			},

			invoke: function invoke(/* ...args */) {
				var args = arguments;
				return Then(this, function(v, next) {
					Fulfill(next, apply(next, v, args));
				});
			},

			spread: function spread(args) {
				var tag = getTagOf(args);
				if (tag != 'Arguments' && tag != 'Array')
					throw new TypeError('Array or arguments object expected.');
				return Then(this, function(v, next) {
					Fulfill(next, apply(next, v, args));
				});
			}

		});


})();

	var Base = Unit,
		$ = createSecret(),

		ObligationConstruct = lazyBind(Obligation.construct),
		PromiseConstruct = lazyBind(Promise.construct);

	// These functions are shared outside of this scope with Contracter.
	ObligationFulfill = lazyBind(Obligation.fulfill);
	ObligationFail = lazyBind(Obligation.fail);
	ObligationWhen = lazyBind(Obligation.when);
	PromiseAbort = lazyBind(Promise.abort);
	PromiseWhen = lazyBind(Promise.when);
	PromiseAddListener = lazyBind(Promise.addListener);
	PromiseGetState = lazyBind(getOwnPropertyDescriptor(Promise, 'state').get);

	return classify('Contract', Base, {

		construct: function construct(params) {

			if (this == null)
				throw new TypeError('Cannot call construct on null or undefined.');

			if (params === undefined)
				params = { };
			else if (typeof params == 'string')
				params = { description: params };

			var O = Object(this),
				description = ('description' in params) ? String(params.description) : '',
				BaseConstruct = Base.construct;

			if (typeof BaseConstruct == 'function')
				call(BaseConstruct, O, params);

			define(O, 'description', {
				value: description,
				enumerable: false,
				writable: false,
				configurable: true
			});

			var stateSwitcher = CreateStateSwitcher({
					states: CONTRACT_STATES,
					pseudoStates: CONTRACT_PSEUDO_STATES,
					initialState: 'pending'
				}),
				// mediator is used as a shared communications channel between the
				// Obligation and the Promise.
				mediator = create(null);
			define(O, 'obligation', {
				value: CreateObligation({
					description: description,
					stateSwitcher: stateSwitcher,
					mediator: mediator
				}),
				enumerable: false,
				writable: false,
				configurable: false
			});
			define(O, 'promise', {
				value: CreatePromise({
					description: description,
					stateSwitcher: stateSwitcher,
					mediator: mediator
				}),
				enumerable: false,
				writable: false,
				configurable: false
			});

			return O;

		}

	});

	function ContractPartConstruct($, resolutions, params) {

		if (Object(params) !== params)
			throw new Error('Params object argument expected.');

		var description = ('description' in params) ? String(params.description) : '';

		if (!('stateSwitcher' in params))
			throw new Error('stateSwitcher param expected.');

		var O = Object(this),
			$O = $(O),
			BaseConstruct = Base.construct;

		if (typeof BaseConstruct == 'function')
			call(BaseConstruct, O, params);

		define(O, 'description', {
			value: description,
			enumerable: false,
			writable: false,
			configurable: false
		});
		$O.stateSwitcher = params.stateSwitcher;

		$O.resolvables = toTruthTable(resolutions);
		$O.mediator = params.mediator;

		return O;

	}

	function ContractGetState($) {

		if (this == null)
			throw new TypeError('Method cannot be called on null or undefined.');

		var O = Object(this),
			$O = $(O),
			stateSwitcher = $O.stateSwitcher;

		if (!stateSwitcher)
			throw new TypeError('Object is not resolvable.');

		return StateSwitcherGetState(stateSwitcher);

	}

	function ContractGetValue($) {

		if (this == null)
			throw new TypeError('Method cannot be called on null or undefined.');

		var O = Object(this),
			$O = $(O),
			stateSwitcher = $O.stateSwitcher,
			value = $O.mediator.value;

		if (!stateSwitcher)
			throw new TypeError('Object is not resolvable.');

		return value;

	}

	function ContractPartResolve($, resolution/*, value */) {

		if (this == null)
			throw new TypeError('Method cannot be called on null or undefined.');

		var value = arguments[2],
			O = Object(this),
			$O = $(O),
			stateSwitcher = $O.stateSwitcher;

		if (!stateSwitcher)
			throw new TypeError('Object is not resolvable.');

		if (!$O.resolvables[resolution])
			throw new TypeError('Object cannot be resolved as "' + resolution + '".');

		if (StateSwitcherGetState(stateSwitcher) != 'pending')
			return;

		$O.mediator.value = value;

		StateSwitcherSwitch(stateSwitcher, resolution);

	}

	function ContractPartAddListener($, createHandler, callbackMap/* | resolution(s), callback(s) */) {

		if (this == null)
			throw new TypeError('when cannot be called on null or undefined.');

		var resolution = arguments[2],
			callback = arguments[3],
			
			O = Object(this),
			$O = $(O),
			stateSwitcher = $O.stateSwitcher;

		if (!stateSwitcher)
			throw new TypeError('Object is not resolvable.');

		var next = CreateContract({ description: '> ' + O.description }),
			nextPromise = next.promise,
			nextObligation = next.obligation,
			handler,
			stateSwitcherHandlers,
			ssWhen = createHandler ? StateSwitcherAddListener : StateSwitcherWhen;

		// TODO: The object branch will (I think) be executed if a String object is passed in as `callbackMap`.
		// Is this the correct behavior? Should I have `getTypeOf` (or another function) not distinguish between strings and String objects?
		if (getTypeOf(callbackMap) == 'object') {

			// We only iterate own properties to provide convenience.
			// eg: when({ ... }) without having to worry about a compromised Object.prototype.
			stateSwitcherHandlers = map(keys(callbackMap),
				function(res) {
					var value = callbackMap[res];
					if (typeof value == 'function')
						return createSack(
							ssWhen(stateSwitcher, res, function() {
								value($O.mediator.value, nextObligation);
							})
						);
					else
						// TODO: mapPartial on Iterable? Then I could use `mapPartial` instead of `without(map(...), undefined)`.
						return without(map(ArrayFrom(value), function(v) {
							if (v === undefined)
								return;
							if (typeof v != 'function')
								throw new TypeError('Function expected.');
							return ssWhen(stateSwitcher, res,
								function() {
									// Turn off the handler so that it can drop its callback, freeing memory,
									// since it no longer does anything.
									if (handler)
										HandlerOff(handler);
									v($O.mediator.value, nextObligation);
									stateSwitcherHandler = null;
								});
						}), undefined);
				});

		} else {

			if (isLike(resolution, 'String'))
				resolution = [ String(resolution) ];
			else if (!isArrayLike(resolution))
				throw new TypeError('String or array expected for resolution.');

			if (typeof callback == 'function')
				callback = [ callback ];
			else if (!isArrayLike(callback))
				throw new TypeError('Function or array expected for callback.');

			stateSwitcherHandlers = map(resolution,
				function(res) {
					return map(callback, function(c) {
						var x = ssWhen(stateSwitcher, res,
							 function() {
								// Turn off the handler so that it can drop its callback, freeing memory,
								// since it no longer does anything.
								if (handler)
							 		HandlerOff(handler);
								c($O.mediator.value, nextObligation);
							});
						return x;
					});
				});

		}

		return createHandler
			? own({
				handler: handler = CreateHandler(function() {
					if (!handler)
						return;
					// stateSwitcherHandlers is a 2 dimensional array.
					forEach(stateSwitcherHandlers, function(u) {
						// TODO: Make a version of forEach which only passes 1 argument
						// to handle this type of case without the need for limit.
						forEach(u, limit(HandlerOff, 1));
					});
					stateSwitcherHandlers = null;
					handler = null;
				}),
				next: nextPromise
			})
			: nextPromise;

	}

	function CreateObligation(params) {
		var o = create(Obligation);
		ObligationConstruct(o, params);
		return o;
	}

	function CreatePromise(params) {
		var p = create(Promise);
		PromiseConstruct(p, params);
		return p;
	}

})();
var Contracter = (function() {

	var Obligor = (function() {

	var Base = Unit,
	
		// I toyed with the idea of having Obligor and Promiser share the same secret, but
		// it turns out to prevent an object from being both an Obligor and a Promiser.
		$ = createSecret();

	return classify('Obligor', Base, {

		construct: function construct(params) {

			if (params == null)
				throw new Error('Params object is required.');

			var obligationMap = params.obligationMap;

			if (obligationMap == null)
				throw new Error('obligationMap param is required.');

			var O = Object(this),
				$O = $(O),
				BaseConstruct = Base.construct;

			if (typeof BaseConstruct == 'function')
				call(BaseConstruct, O, params);
			
			$O.map = obligationMap;

			return O;

		},

		when: preload(ContracterPartWhen, 'Obligor', $, ObligationWhen),

		fulfill: preload(ContracterPartResolve, 'Obligor', $, 'fulfill', ObligationFulfill),
		fail: preload(ContracterPartResolve, 'Obligor', $, 'fail', ObligationFail)

	});

})();
var Promiser = (function() {

	var Base = Unit,
		$ = createSecret();

	return classify('Promiser', Base, {

		construct: function construct(params) {

			if (params == null)
				throw new Error('Params object is required.');

			var promiseMap = params.promiseMap;

			if (promiseMap == null)
				throw new Error('promiseMap param is required.');

			var O = Object(this),
				$O = $(O),
				BaseConstruct = Base.construct;

			if (typeof BaseConstruct == 'function')
				call(BaseConstruct, O, params);

			$O.map = promiseMap;

			return O;

		},

		when: preload(ContracterPartWhen, 'Promiser', $, PromiseWhen),

		abort: preload(ContracterPartResolve, 'Promiser', $, 'abort', PromiseAbort)

	});

})();

	var Base = Unit,

		CreateObligor = lazyBind(Obligor.construct),
		CreatePromiser = lazyBind(Promiser.construct);

	return classify('Contracter', Base, {

		construct: function construct(params) {

			if (params == null)
				throw new Error('Params object is required.');

			var contracts = params.contracts;

			if (contracts == null)
				throw new Error('contracts param is required.');

			if (!isArrayLike(contracts))
				throw new TypeError('contracts param must be an array-like object.');

			var O = Object(this),
				BaseConstruct = Base.construct;

			if (typeof BaseConstruct == 'function')
				call(BaseConstruct, O, params);

			var obligationMap = create(null),
				promiseMap = create(null);

			forEach(contracts, function(name) {
				name = String(name);
				var contract = CreateContract({ description: 'Contracter: "' + name + '"' });
				obligationMap[name] = contract.obligation;
				promiseMap[name] = contract.promise;
			});

			define(O, 'obligor', {
				value: CreateObligor({ obligationMap: obligationMap }),
				enumerable: false,
				writable: false,
				configurable: false
			});

			define(O, 'promiser', {
				value: CreatePromiser({ promiseMap: promiseMap }),
				enumerable: false,
				writable: false,
				configurable: false
			});

			return O;

		}

	});

	// TODO: Switch to addListener model like in Contract.
	function ContracterPartWhen(TagName, $, When, $3/*, ?contractName(s), map | ?resolution, callback */) {

		if (this == null)
			throw new TypeError('when cannot be called on null or undefined.');

		var O = Object(this),
			contractNames, map,
			resolution = arguments[4],
			callback,
			cmap = $(O).map;

		if (cmap == null)
			throw new TypeError('when must be called on a' + (TagName == 'Obligor' ? 'n' : '') + TagName + '.');

		if ($3 == null)
			throw new TypeError('Null or undefined not expected.');
		else if (isLike($3, 'String'))
			contractNames = [ $3 ];
		else if(isLike($3, 'Array'))
			contractNames = ArrayFrom($3);
		else
			map = mapToObject(keys($3), function(key) {
				var value = $3[key];
				if (typeof value == 'function')
					value = own({ fulfilled: value });
				else if (value == null)
					value = create(null);
				return [ key, Object(value) ];
			});

		if (contractNames) {

			if (typeof resolution == 'function') {
				resolution = 'fulfilled';
				callback = arguments[4];
			} else {
				resolution = String(resolution);
				callback = arguments[5];
			}

			if (typeof callback != 'function')
				throw new TypeError('Function expected for callback argument.');

			map = create(null);
			forEach(contractNames, function(cName) {
				var resMap = create(null);
				resMap[resolution] = callback;
				map[cName] = resMap;
			});

		}

		var followups = own({ length: 0 }),
			error = NO_ERROR;

		forEach(keys(map), function(contractName) {

			var promise = cmap[contractName];

			if (promise == null)
				throw new Error('Contract not found: "' + contractName + '"');

			try {
				push(followups, When(promise, map[contractName]));
			} catch(x) {
				if (error === NO_ERROR)
					error = x;
			}

		});

		if (error)
			throw error;

		if (followups.length == 0)
			return wrap();
		else if (followups.length == 1)
			return followups[0];
		else
			return PromiseManager.all(followups);

	}

	function ContracterPartResolve(TagName, $, resolutionName, Resolve, contractName/*, value */) {

		if (this == null)
			throw new TypeError(resolutionName + ' cannot be called on null or undefined.');

		var O = Object(this),
			value = arguments[5],
			map = $(O).map;

		if (map == null)
			throw new TypeError(resolutionName + ' must be called on an Obligor.');

		contractName = String(contractName);

		var contractPart = map[contractName];

		if (contractPart == null)
			throw new Error('Contract not found: "' + contractName + '"');

		return Resolve(contractPart, value);

	}

})();

	var StateSwitcherConstruct = lazyBind(StateSwitcher.construct),
		StateSwitcherWhen = lazyBind(StateSwitcher.when),
		StateSwitcherGetState = lazyBind(StateSwitcher.getState),
		StateSwitcherSwitch = lazyBind(StateSwitcher.switch),
		StateSwitcherAddListener = lazyBind(StateSwitcher.addListener),

		ContractConstruct = lazyBind(Contract.construct),

		HandlerOff = lazyBind(Handler.off),
		HandlerConstruct = lazyBind(Handler.construct),

		Resync = own({
			
			StateSwitcher: StateSwitcher,

			Contract: Contract,
			Contracter: Contracter,
			PromiseManager: PromiseManager,

			coerce: coerce,
			wrap: wrap

		});

	// Expose PromiseManager functions on Resync.
	candy.mixin(Resync, PromiseManager);

	(function() {
		// This script can be used to convert Spawn-type prototypical objects into
// regular JavaScript cosntructors.

var adapter = (function() {

	var apply = Function.prototype.call.bind(Function.prototype.apply),
		hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty),

		isPrototypeOf = Function.prototype.call.bind(Object.isPrototypeOf);

	function convert(proto) {

		if (typeof Unit === 'undefined')
			throw new TypeError('Unit is required to be available in scope.');

		var C = proto.construct,
			constructor;

		if (typeof C == 'function') {
			// TODO: Use createWrapper to keep constructor.length the same as C.length.
			constructor = function() {
				apply(C, this, arguments);
			};
		} else
			constructor = function() { };

		constructor.prototype = proto;
		delete proto.construct;

		return constructor;

	}

	function convertLib(lib) {

		if (typeof Unit === 'undefined')
			throw new TypeError('Unit is required to be available in scope.');

		Object.getOwnPropertyNames(lib).forEach(function(name) {
			var desc = Object.getOwnPropertyDescriptor(lib, name);
			if (hasOwn(desc, 'value')
				&& desc.value != null
				&& isPrototypeOf(Unit, desc.value)) {
				desc.value = convert(desc.value);
				Object.defineProperty(lib, name, desc);
			}
		});
	}

	return {
		convert: convert,
		convertLib: convertLib
	};

})();
		adapter.convertLib(Resync);
	})();

	return Resync

	function coerce(value) {
		// If value is a promise, it is returned.
		// If value is a contract, the promise is returned.
		// Otherwise, it returns a promise which is fulfilled with the value.
		// TODO: Convert other forms of promises (such as Q promises) to Resync promises?
		if (isLike(value, 'Promise'))
			return value;
		if (isLike(value), 'Contract') {
			value = value.promise;
			if (isLike(value, 'Promise'))
				return value;
			else
				throw new TypeError('Contract has no promise property.');
		}
		return wrap(value);
	}

	function wrap(value/*, resolution */) {
		var resolution = arguments[1];
			contract = CreateContract(),
			obligation = contract.obligation,
			promise = contract.promise;
		if (resolution == null)
			resolution = 'fulfilled';
		resolution = String(resolution);
		switch(resolution) {
			case 'fulfilled':
				ObligationFulfill(obligation, value);
				break;
			case 'failed':
				ObligationFail(obligation, value);
				break;
			case 'aborted':
				PromiseAbort(promise, value);
				break;
			default:
				throw new TypeError('Unsopported resolution: "' + resolution) + '"';
		}
		return promise;
	}

	function CreateHandler(params) {
		var h = create(Handler);
		HandlerConstruct(h, typeof params == 'function' ? params : own(params));
		return h;
	}

	function CreateContract(params) {
		var c = create(Contract);
		ContractConstruct(c, own(params));
		return c;
	}

	function CreateStateSwitcher(params) {
		var ss = create(StateSwitcher);
		StateSwitcherConstruct(ss, own(params));
		return ss;
	}

	// TODO: Check for places in all libraries where "[ ]" is being used and proabaly replace
	// them all with "sacks" to avoid a problem where, for example,
	// `Object.defineProperty(Array.prototype, 5, { value: function EvilFunction })`
	// could be used to break array method integrity on true arrays.
	// TODO: Possibly move this function out of Resync & possibly generalize in some way, though I'm not sure how.
	function createSack(/* ...items */) {
		var sack = create(null);
		sack.length = 0;
		forEach(arguments, function(u) {
			push(sack, u);
		});
		return sack;
	}

	function SackFrom(arrayLike) {
		var sack = create(null),
			L = arrayLike.length >>> 0;
		for (var i = 0; i < L; i++) {
			if (i in arrayLike)
				sack[i] = arrayLike[i];
		}
		sack.length = L;
		return sack;
	}

	// TODO: Move elsewhere to be used in other libraries? Maybe there should be a tempo-core lib that houses these kinds of things (inc Unit and createSack).
	// TODO: rename?
	function classify(tag/*, ...begetParams */) {
		var obj = spread(beget, ArraySlice(arguments, 1));
		$$(obj, 'toStringTag', String(tag));
		return obj;
	}

})(Object, String, TypeError, RangeError, Error);

// exports
if (typeof module == 'object' && module != null
	&& typeof module.exports == 'object' && module.exports != null)
	module.exports = Resync;
