/**
 * 基础组件库
 *      只一共一个Base.extend方法，Mixin机制：http://mzhou.me/?p=95534
 *      注意它不是用于实现OO的方式，它是更适用于javascript的继承方式
 *      以下写法在extend之后会有bug
 *      Base.method = function() {
 *          Base.add();     // 多个实例的时候会冲突，用this.add();替换
 *      }
 *      var a = 1;
 *      Base.prototype.method  = function() {
 *          a++;            // 多个实例共用了一个闭包中的变量，如需存储临时变量，使用this.a++，如果需要隐藏使用_前缀作为区分，即this._a
 *      }
 *
 * @author: mzhou
 * @eg: function F() {}
 *      Base.extend( F );           // F拥有了Base的所有prototype方法与变量和静态方法与变量，可以理解为Base扩展了F
 *      function S() {}
 *      F.extend( S );              // F扩展了S
 *      Base.extend( S, F );        // F扩展了S，另一种调用方法
 * @log 0.1 
 */

/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'Base', function() {
    'use strict';
    var Base = function(){};

    Base.extend = function( Klass, _Father ) {
        var Father = _Father || this;
        for( var staticMethod in Father ) {
            if ( Father.hasOwnProperty( staticMethod ) && staticMethod !== 'prototype' ) {
		// On mac safari 5.0.2, staticMethod may be prototype
                Klass[staticMethod] = Father[staticMethod];
            }
        }
        for ( var method in Father.prototype ) {
            if ( Father.prototype.hasOwnProperty( method ) ) {
                Klass.prototype[method] = Father.prototype[method];
            }
        }
    };
    return Base;
});
