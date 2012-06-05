/**
 * screenTop，用于处理添加“返回顶部”功能
 * 样式存于/skin/lib/screen-top.css
 * @author mzhou
 * @log 0.1
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "support.js";
//@import "scrollTo.js";

G.def('screenTop', ['support','scrollTo'], function( support, scrollTo ) {
    'use strict';
    var $top = $('<a class="gui-screen-top" href="#"><s></s><b></b>返回顶部</a>'),
        inited = false,
        isShowed = false,
        $win = $(window),
        top,
        bottomOffset;

    if ( !support.fixed() ) {
        $top.css('bottom','auto');
    }

    /**
     * 显示
     */
    function show() {
        var clientHeight = $win.height();
        // 显示
        if ( (top > clientHeight*2) ) {
            if ( !support.fixed() ) {
                $top.css('top', top + clientHeight - bottomOffset);
            }
            if ( isShowed ) {
                return;
            }
            if ( !inited ) {
                $top.appendTo( 'body' );
                bottomOffset += $top.outerHeight(); // 加上本身的高度
                inited = true;
            }
            $top.show();
            isShowed = true;
        // 隐藏
        } else if ( isShowed ) {
            $top.hide();
            isShowed = false;
        }
    }

    return function( _bottomOffset ) {
        if ( !support.fixed() ) {
            // 如果不支持fixed，则需要计算距离底部的偏移量，默认为80
            // 如果支持，则由CSS控制
            bottomOffset = (_bottomOffset || 80);
        }
        $win.scroll(function() {
            top = $win.scrollTop();
            setTimeout(show);
        });
        top = $win.scrollTop();
        $top.click(function(e) {
            e.preventDefault();
            scrollTo(0);
        });
        show();
    };
});
