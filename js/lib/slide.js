/**
 * slide模块，大看版会用到
 * 
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'slide', function() {
    'use strict';
    var current = 'current';
    /**
     * 显示指定次序的slide，从0开始
     * @param {number} number 次序号，从0开始
     * @param {string} current 高亮的样式类“current”
     * @param {object} contents 内容的jquery对象集合
     * @param {object} tags 标签的jquery对象集合
     */
    function showSlide( number, current, $contents, $tags ) {
        $contents.hide();
        $contents.eq( number ).show();
        $tags.removeClass( current );
        $tags.eq( number ).addClass( current );
    }

    /**
     * 初始化slide
     * @param {object} $slide 大看版的容器对象，此对象第一个元素为图片集合，第二个为触发器集合
     * @param {number} _now 指定默认显示的图片，从0开始
     * @param {number} _interval 指定轮播间隔，默认为5000ms
     *                           -1为不轮播。
     * @param {object} option 可选参数
     *                          showEffect: 显示时候的函数
     */
    return function( $slide, _now, _interval, option ) {
        var now        = _now || 0,
            interval   = _interval || 5000,
            working    = 1,
            $contentsC = $slide.children().eq(0),
            $contents  = $contentsC.children(),
            $tagsC     = $slide.children().eq(1),
            $tags      = $tagsC.children(),
            max        = $tags.length;

        function show( now ) {
            if ( option && option.showEffect ) {
                option.showEffect( now, current,  $contents, $tags );
            } else {
                showSlide( now, current, $contents, $tags );
            }
        }

        function stop() {
            working = 0;
        }

        function start() {
            working = 1;
        }

        show( now );
        if ( interval !== -1 ){
            setInterval(function() {
                if ( working ) {
                    now++;
                    now = now % max;
                    show( now );
                }
            }, interval );
        }

        $contentsC.hover( stop, start );
        $tags.mouseover(function() {
            stop();
            now = $tags.index( this );
            show( now );
        }).mouseout( start );

        return {
            /**
             * 显示第几个
             * @param {number} now 第几个
             * @return {object} 当前对象
             */
            show: function() {
                show();
                return this;
            },
            /**
             * 停止轮播
             * @return {object} 当前对象
             */
            stop: function() {
                stop();
                return this;
            },
            /**
             * 开始轮播
             * @return {object} 当前对象
             */
            start: function() {
                start();
                return this;
            }
        };
    };
});
