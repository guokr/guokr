/**
 * 本地存储库
 * onStorage部分代码参考了：http://m.udpwork.com/item/5588.html
 * @author: mzhou
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "JSON2.js";
G.def( 'store', ['JSON2'], function() {
    'use strict';
    var isSupport = 'localStorage' in window,
        api = {
            set: function(){},
            get: function(){},
            remove: function() {},
            clear: function() {},
            isSupport: false
        };
    if ( isSupport ) {
        var lc = window.localStorage;
        /**
         * 构建onSorage函数
         * @param {string} key 键值
         * @param {function} callback 回调函数
         */
        var createOnStorage = function ( key, callback ) {
            var oldValue = lc[key];
            return function( e ) {
                // setTimeout: bugfix for IE
                setTimeout(function() {
                    e = e || window.storageEvent;

                    var changedKey = e.key,
                        newValue = e.newValue;
                    // IE 不支持key、newValue
                    if( !changedKey ) {
                        var nv = lc[key];
                        if( nv != oldValue ) { // 通过值是否相等来判断
                            changedKey = key;
                            newValue = nv;
                        }
                    }

                    if( changedKey == key ) {
                        if (callback) {
                            callback(
                                newValue == null ? null : JSON.parse( newValue )
                            ); // 解析
                        }
                        oldValue = newValue;    // 更新值
                    }
                }, 0);
            };
        };
        api.set = function( key, value ) {
            lc.setItem( key, JSON.stringify(value));
        };
        api.get = function( key ) {
            var i = lc.getItem( key );
            return i == null ? null : JSON.parse(i);
        };
        api.remove = function( key ) {
            lc.removeItem( key );
        };
        api.clear = function() {
            lc.clear();
        };
        // NOTE: IE在自己修改数据的时候也会收到消息
        api.onStorage = function( key, callback ) {
            if( window.addEventListener ) {
                window.addEventListener('storage', createOnStorage( key, callback ), false );
            } else{
                // IE 在document上
                document.attachEvent('storage', createOnStorage( key, callback ) );
            }
        };
        api.isSupport = true;
    }
    return api;
});
