/**
 * 实现页面滚动的组件(在可视区域内则不滚动)
 * @author mzhou
 * @eg scrollTo( 100 );                             // 上下滚动,没有回调
 *     scrollTo( 100, function(){} );               // 上下滚动
 *     scrollTo( $obj );                            // 滚动到某一个元素
 *     scrollTo( $obj, function(){} );              // 滚动到某一个元素,没有回调
 *     scrollTo( {top: 100,left: 10}} );            // 滚动到某一个位置,没有回调
 *     scrollTo( {top: 100,left: 10}, function{} ); // 滚动到某一个位置
 *
 *     可选参数：[ cb, [time|type] ]
 *          【滚动时间（数字），默认为1秒】
 *          【滚动方向（字符串），当target为数字时默认为'top'，否则默认为‘all’】
 *          scrollTo( 100, function(){}, 'left'  );  // 左右滚动
 *          scrollTo( 100, function(){}, 1000 );     // 1000ms内完成滚动
 *          scrollTo( 100, function(){}, 1000, 'all');
 *          scrollTo( 100, function(){}, 1000, 'top');
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "jquery/easing.js";
G.def('scrollTo', ['jquery/easing'], function(easing) {
    'use strict';
    var $body = $('html,body'); /* fix opera bug */

    /**
     * 判断一个元素或点是否在可是范围内
     */
    function inView(position) {
        var left = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft,
            top = window.scrollY || window.pageYOffset || document.documentElement.scrollTop,
            bottom = top + (window.innerHeight || document.documentElement.clientHeight),
            right = left + (window.innerWidth || document.documentElement.clientWidth),
            pointL = position.scrollLeft,
            pointT = position.scrollTop,
            pointR = pointL + (position.width || 0),
            pointB = pointT + (position.height || 0),
            notInX = false,
            notInY = false;
        if (pointL != null && pointL < left || pointR > right) {
            notInX = true;
        }
        if (pointT != null && pointT < top || pointB > bottom) {
            notInY = true;
        }
        if (notInX && notInY) {
            // x,y轴都不在视图中
            return 3;
        } else if (notInY) {
            // y轴不在视图中,x在
            return 2;
        } else if (notInX) {
            // x轴不在视图中,y在
            return 1;
        } else {
            // x,y都在视图中
            return 0;
        }
    }

    /**
     * 滚动(在可视区域内则不滚动)
     * @param {object/number} target jquery对象或{top:1,left:1}或数字
     * @param {function} cb 【可选】滚动结束之后的回调函数
     * @param {number} _time 【可选】滚动动画的时间，默认为1秒
     * @param {string} _type 【可选】滚动类型：'top','left','all'；当target为数字时默认为'top'，否则默认为‘all’；
     * @param {object} coordinates 【未实现】坐标系,当target为jquery对象时会被传入其offset方法，此功能暂时屏蔽
     * @return {boolean} 是否滚动过，如果在可视窗内则不滚动
     */
    return function(target, cb, _time, _type /*, coordinates*/ ) {
        var targetIsNumber = typeof target === 'number',
            offset = targetIsNumber ? {
                top: target,
                left: target
            } : (target.offset ? target.offset( /*coordinates*/ ) : target),
            properties = {},
            isInView,
            time,
            type;

        if (typeof _time === 'number') {
            time = _time;
            type = typeof _type === 'string' ? _type : 'top';
        } else if (typeof _time === 'string') {
            time = 1000;
            type = _time;
        } else {
            time = 1000;
            type = targetIsNumber ? 'top' : 'all';
        }

        switch (type) {
        case 'all':
            properties.scrollTop = offset.top;
            properties.scrollLeft = offset.left;
            break;
        case 'top':
            properties.scrollTop = offset.top;
            break;
        case 'left':
            properties.scrollLeft = offset.left;
            break;
        default:
            return;
        }

        // 如果是jquery，对象则会考虑元素的宽度与高度
        if (target.jquery) {
            properties.width = target.width();
            properties.height = target.height();
        }
        isInView = inView(properties);
        // 去掉刚才去掉的宽高
        if (target.jquery) {
            delete properties.width;
            delete properties.height;
        }
        switch (isInView) {
            // 不必滑动
        case 0:
            if (cb) {
                cb();
            }
            return false;
        case 1:
            delete properties.scrollTop;
            doScroll();
            return true;
        case 2:
            delete properties.scrollLeft;
            doScroll();
            return true;
        case 3:
            doScroll();
            return true;
        default:
            break;
        }

        function doScroll() {
            $body.animate(properties, time || 1000, 'easeInOutCirc', cb ?
            function callBack() {
                if (callBack.exed) {
                    cb();
                }
                callBack.exed = true;
            } : null);
        }
    };
});
