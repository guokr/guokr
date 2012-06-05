/**
 * 扩展于Base组件，实现了基础的事件的分发与订阅。一般用于UI组件的事件机制，例如：Menu组件
 * @author mzhou
 * @eg  var e = new Event();
 *      e.on( 'test', function( data ) {
 *          console.log( data );        // data值
 *          console.log( this );        // context值
 *      }, context );
 *
 *      e.on( 'test', function( data, data2 ) {    // 可省略on的参数；回调函数参数可以是多个
 *          console.log( data2 );
 *      });
 *
 *      e.on( 'test', function() {          // 绑定只执行一次的回调函数
 *          return false;                   // 当有任意一个回调返回false的时候，trigger返回false
 *      }, context, true);
 *
 *      e.fire( 'test', 'data' );           // 返回false
 *      e.fire( 'test' );                   // 省略参数。返回true，因为返回false的回调只执行一次
 *      e.fire( 'test', 'data', 'data2' );  // 可以设置多个参数，作为回调函数的参数
 * @log 0.1
 *      0.2 修改实例变量queue为eventQueue
 *
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "Base.js";
G.def( 'Event', ['Base'], function( Base ) {
    'use strict';
    var slice = Array.prototype.slice;
    function Event() {
    }

    /**
     * 注册事件
     * @param {string} name 事件名
     * @param {function} callback 事件的回调函数
     * @param {object} context 【可选】回调函数的this值
     * @param {boolean} once 【可选】是否只执行一次
     * @return {object} this
     */
    Event.prototype.on = function( name, callback, context, once ) {
        this.eventQueue = this.eventQueue || {};
        this.eventQueue[name] = this.eventQueue[name] || [];
        this.eventQueue[name].push({
            callback: callback,
            context: context,
            once: once
        });
        return this;
    };
    /**
     * 取消注册事件
     * @param {string} name
     * @param {function} callback 【可选】指定要取消的回调函数
     * @return {object} this
     */
    Event.prototype.off = function( name, callback ) {
        this.eventQueue = this.eventQueue || {};
        if ( this.eventQueue[name] == null ) {
            return;
        }
        if ( callback ) {
            this.eventQueue[name] = G.filter( this.eventQueue[name], function( value, index ) {
                return value.callback !== callback;
            });
            if ( this.eventQueue[name].length === 0 ) {
                delete this.eventQueue[name];
            }
        } else {
            delete this.eventQueue[name];
        }
        return this;
    };
    /**
     * 激活事件
     * @param {string} name
     * @param {object} data 传递给事件回调函数的参数值
     * @return {object} this
     */
    Event.prototype.fire = function( name, data ) {
        this.eventQueue = this.eventQueue || {};
        var q = this.eventQueue[name],
            r = true;
        if ( q ) {
            var arg = slice.call( arguments, 1 );
            G.each( q, function( value ) {
                if ( value.callback.apply( value.context, arg ) === false ) {
                    r = false;
                }
                if ( value.once ) {
                    this.off( name, value.callback );
                }
            }, this);
        }
        return r;
    };
    Base.extend(Event);

    return Event;
});
