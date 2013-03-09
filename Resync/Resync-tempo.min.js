// TODO: Any array-likes which are accepted as arguments should need to be converted into true Arrays
// before using generic methods like `map`, `filter`, and `slice` whenever the library is expecting an
// array to be generated from these methods.
var Resync = (function(Object, String, TypeError, RangeError, Error) {

	'use strict';

	// Override any `module` or `exports` variables which exist outside of this
	// scope; otherwise, some includes will try to mix into them.
	var module = null, exports = null;

	
	
	var __exports__ = (function() {
			var exports = Object.create(null);
			
			var $$ = exports.$$;
			
			
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
