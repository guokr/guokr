/**
 * 动画效果库
 *
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "support.js";

G.def('Anime', ['support'], function( support ) {
    'use strict';
    return {
        addCssString: function( css ) {
            document.getElementsByTagName('head')[0].appendChild( $('<style>'+css+'</style>')[0] );
        },
        loading: function( $obj ) {
            if ( !$obj.jquery ) {
                $obj = $($obj);
            }
        },
        /**
         * 一个快速抖动的动画
         * @param {object} $obj 需要抖动的对象
         * @param {function} cb 动画结束后的回调函数，使用setTimeout实现，所以不靠谱
         * @param {number} time 执行时间
         * @param {number} delay 延迟执行时间
         */
        shaking: function( $obj, cb, time, delay ) {
            if ( !support.cssanimation() ) {
                if ( cb ) {
                    cb( $obj );
                }
                return;
            }
            time = time || 500;
            delay = delay || 0;
            if ( !this.shakingCssAdded ) {
                try {
                    this.addCssString( G.format('@-webkit-keyframes guiShaking {\
                            0% { -webkit-transform: translate(2px, 1px) rotate(0deg);transform: translate(2px, 1px) rotate(0deg); }\
                            10% { -webkit-transform: translate(-1px, -2px) rotate(-1deg);transform: translate(-1px, -2px) rotate(-1deg); }\
                            20% { -webkit-transform: translate(-3px, 0px) rotate(1deg);transform: translate(-3px, 0px) rotate(1deg); }\
                            30% { -webkit-transform: translate(0px, 2px) rotate(0deg);transform: translate(0px, 2px) rotate(0deg); }\
                            40% { -webkit-transform: translate(1px, -1px) rotate(1deg);transform: translate(1px, -1px) rotate(1deg); }\
                            50% { -webkit-transform: translate(-1px, 2px) rotate(-1deg);transform: translate(-1px, 2px) rotate(-1deg); }\
                            60% { -webkit-transform: translate(-3px, 1px) rotate(0deg);transform: translate(-3px, 1px) rotate(0deg); }\
                            70% { -webkit-transform: translate(2px, 1px) rotate(-1deg);transform: translate(2px, 1px) rotate(-1deg); }\
                            80% { -webkit-transform: translate(-1px, -1px) rotate(1deg);transform: translate(-1px, -1px) rotate(1deg); }\
                            90% { -webkit-transform: translate(2px, 2px) rotate(0deg);transform: translate(2px, 2px) rotate(0deg); }\
                            100% { -webkit-transform: translate(1px, -2px) rotate(-1deg);transform: translate(1px, -2px) rotate(-1deg); }\
                          }\
                          @-moz-keyframes guiShaking {\
                            0% { -moz-transform: translate(2px, 1px) rotate(0deg);transform: translate(2px, 1px) rotate(0deg); }\
                            10% { -moz-transform: translate(-1px, -2px) rotate(-1deg);transform: translate(-1px, -2px) rotate(-1deg); }\
                            20% { -moz-transform: translate(-3px, 0px) rotate(1deg);transform: translate(-3px, 0px) rotate(1deg); }\
                            30% { -moz-transform: translate(0px, 2px) rotate(0deg);transform: translate(0px, 2px) rotate(0deg); }\
                            40% { -moz-transform: translate(1px, -1px) rotate(1deg);transform: translate(1px, -1px) rotate(1deg); }\
                            50% { -moz-transform: translate(-1px, 2px) rotate(-1deg);transform: translate(-1px, 2px) rotate(-1deg); }\
                            60% { -moz-transform: translate(-3px, 1px) rotate(0deg);transform: translate(-3px, 1px) rotate(0deg); }\
                            70% { -moz-transform: translate(2px, 1px) rotate(-1deg);transform: translate(2px, 1px) rotate(-1deg); }\
                            80% { -moz-transform: translate(-1px, -1px) rotate(1deg);transform: translate(-1px, -1px) rotate(1deg); }\
                            90% { -moz-transform: translate(2px, 2px) rotate(0deg);transform: translate(2px, 2px) rotate(0deg); }\
                            100% { -moz-transform: translate(1px, -2px) rotate(-1deg);transform: translate(1px, -2px) rotate(-1deg); }\
                          }\
                          @keyframes guiShaking {\
                            0% { transform: translate(2px, 1px) rotate(0deg); }\
                            10% { transform: translate(-1px, -2px) rotate(-1deg); }\
                            20% { transform: translate(-3px, 0px) rotate(1deg); }\
                            30% { transform: translate(0px, 2px) rotate(0deg); }\
                            40% { transform: translate(1px, -1px) rotate(1deg); }\
                            50% { transform: translate(-1px, 2px) rotate(-1deg); }\
                            60% { transform: translate(-3px, 1px) rotate(0deg); }\
                            70% { transform: translate(2px, 1px) rotate(-1deg); }\
                            80% { transform: translate(-1px, -1px) rotate(1deg); }\
                            90% { transform: translate(2px, 2px) rotate(0deg); }\
                            100% { transform: translate(1px, -2px) rotate(-1deg); }\
                          }\
                          .gui-anime-shaking-inline,\
                          .gui-anime-shaking {\
                            display:block;\
                            position: relative;\
                            -webkit-animation-name: guiShaking;\
                            -webkit-animation-duration: <t>s;\
                            -webkit-animation-delay: <d>s;\
                            -webkit-transform-origin:50% 50%;\
                            -webkit-animation-iteration-count: 1;\
                            -webkit-animation-timing-function: linear;\
                            -moz-animation-name: guiShaking;\
                            -moz-animation-duration: <t>s;\
                            -moz-animation-delay: <d>s;\
                            -moz-transform-origin:50% 50%;\
                            -moz-animation-iteration-count: 1;\
                            -moz-animation-timing-function: linear;\
                            animation-name: guiShaking;\
                            animation-duration: <t>s;\
                            animation-delay: <d>s;\
                            transform-origin:50% 50%;\
                            animation-iteration-count: 1;\
                            animation-timing-function: linear;\
                          }\
                          .gui-anime-shaking-inline {\
                            display: inline-block;\
                        }', {t:time/1000, d: delay/1000}, /<([^<>]+)>/g) );
                }catch (e) {
                    // IE 不支持此css，会报错
                    if (cb) {
                        cb( $obj );
                    }
                    return;
                }
                this.shakingCssAdded = true;
            }
            if ( $obj.css('display') === 'inline' ) {
                $obj.addClass('gui-anime-shaking-inline');
            } else {
                $obj.addClass('gui-anime-shaking');
            }
            function end() {
                $obj.removeClass('gui-anime-shaking');
                $obj.removeClass('gui-anime-shaking-inline');
                if (cb) {
                    cb( $obj );
                }
            }
            /*
            if ( $obj[0].addEventListener ) {
                // 只有firefox支持这个事件，支持的很差，所以暂时不考虑使用了
                $obj[0].addEventListener( 'animationend', end, false);
            }*/
            setTimeout( end, time+delay);
        }
    };
});
