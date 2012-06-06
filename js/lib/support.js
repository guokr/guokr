/**
 * 特征检测库，目前只支持fixed
 * @author mzhou
 * @log 0.1
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'support', function() {
    'use strict';
    var prefixes      = ' -webkit- -moz- -o- -ms- -khtml- '.split(' '),
        cssomPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
        el            = document.createElement('div');
    return {
        /**
         * 判断支持position:fixed与否
         * ios5版本及之后支持了fixed，但是没有好的特征检测方法，故先用ua探测，以后增强
         */
        fixed: function supportFixed() {
            // 缓存
            if ( typeof supportFixed.r !== 'undefined' ) {
                return supportFixed.r;
            }
            var result = true;
            if ( G.ua.isIpad || G.ua.isIphone ) {
               result = navigator.userAgent.match(/[5-9]_[0-9]/) !== null;
            } else {
                var outer = document.createElement('div'),
                    inner = document.createElement('div');

                outer.style.position = 'absolute';
                outer.style.top = '200px';

                inner.style.position = 'fixed';
                inner.style.top = '100px';

                outer.appendChild(inner);
                document.body.appendChild(outer);

                if (inner.getBoundingClientRect && 
                    inner.getBoundingClientRect().top == outer.getBoundingClientRect().top) {
                    result = false;
                }
                document.body.removeChild(outer);
                outer = null;
                inner = null;
            }
            supportFixed.r = result;
            return result;
        },
        touchEvent: function supportTouchEvent() {
            // 缓存
            if ( typeof supportTouchEvent.r !== 'undefined' ) {
                return supportTouchEvent.r;
            }
            var result = true,
                events = [
                    'touchstart',
                    'touchmove',
                    'touchend',
                    'touchcancel'
                ];

            for( var i=0,l=events.length; i<l; i++ ) {
                var eventName = events[i];
                eventName = 'on' + eventName;
                var isSupported = (eventName in el);
                if ( !isSupported ) {
                    el.setAttribute(eventName, 'return;');
                    isSupported = typeof el[eventName] === 'function';
                }
                if ( !isSupported ) {
                    result = false;
                    break;
                }
            }
            supportTouchEvent.r = result;
            return result;
        },
        /**
         * copy自modernizr: <https://github.com/Modernizr/Modernizr/blob/master/modernizr.js>
         */
        cssanimation: function supportCssAnimation() {            // 缓存
            if ( typeof supportCssAnimation.r !== 'undefined' ) {
                return supportCssAnimation.r;
            }
            var result = false,
                mStyle = el.style,
                prop = 'animationName',
                ucProp = prop.charAt(0).toUpperCase() + prop.substr(1),
                props = (prop + ' ' + cssomPrefixes.join(ucProp + ' ') + ucProp).split(' ');
            for ( var i in props ) {
                if ( mStyle[ props[i] ] !== undefined ) {
                    result = true;
                    break;
                }
            }
            supportCssAnimation.r = result;
            return result;
        }
    };
});
