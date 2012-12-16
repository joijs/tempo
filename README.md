# tempo
*Developing a next-generation framework for ECMAScript 5, built for modern browsers and server environments.*

## Goals

tempo serves two purposes:

1. Today, tempo is a loosely-knit group of experimental projects. Many of these projects (such as [Harmonize](https://github.com/joijs/tempo/tree/master/Harmonize), [Spawn](https://github.com/joijs/tempo/tree/master/Spawn), and candy) are released as stand-alone mini-libraries. However, they are also intended to serve as the backbone for a larger framework.

2. Going forward, tempo is intended to be developed into a cohesive, large-scale framework.

## Target Environments

### ECMAScript 5

*tempo is targeted toward ECMAScript 5.* Most of the sub-projects are intended to be host environment agnostic, meaning that they should run just as well on a server as in a browser, as long as it is an ES5 environment. However, there are also plans to develop a DOM-related project as a part of tempo targeted more specifically toward the browser.

### ECMAScript 6

*tempo is being built in expectation of ECMAScript 6.* We're totally pumped about the plans for ES6, and we're trying to built tempo as a bridge between worlds. One of the most foundational tempo modules is [Harmonize](https://github.com/joijs/tempo/tree/master/Harmonize), which is a library of shims for ES6 built-ins. It includes everything from WeakMaps to Symbols to really cool extras for familiar built-ins like String and Number. Harmonize is being developed along with the ES6 draft and the intention is to keep Harmonize up-to-date on an ongoing basis. This allows us to start using some of the ES6 features in tempo today, and once ES6 is natively supported by browsers, our shims will step aside and everything should still work!

## License

tempo and its sub-projects are released under the [MIT license](https://github.com/joijs/tempo/blob/master/LICENSE.md).

Developed and maintained by Nathan Wall