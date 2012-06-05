/**
 * 全局的导航栏的弹出菜单
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'gPopMenu', function() {
    'use strict';
    /**
     * 初始化
     * @param {object} miniList 弹出菜单跟元素
     * @param {boolean} isSMenu 是否是小菜单
     */
    function init( miniList, isSMenu ) {
        var miniTitle = isSMenu ? miniList : miniList.children(':eq(0)'),
        miniBlock = isSMenu ? miniList.next() : miniList.children(':eq(1)');
        miniTitle.mouseover(function() {
            if ( isSMenu ) {
                if ( G.ua.isIE6 ) {
                    miniBlock.width( miniTitle.outerWidth()+2 );
                }
                miniBlock.show();
            } else {
                miniList.addClass('hover');
            }
        });
        if ( isSMenu ) {
            miniBlock.mouseleave(function() {
                miniBlock.hide();
            });
        } else {
            /*
            var blockout = function(e) {
                var toElement = e.toElement || e.relatedTarget;
                if (toElement != miniTitle[0] && !$.contains(miniTitle[0],toElement) && toElement != miniBlock[0] && !$.contains(miniBlock[0],toElement)) {
                    miniList.removeClass('hover');
                }
            };
            miniTitle.mouseout(blockout);
            miniBlock.mouseout(blockout);
            */
            miniList.mouseleave(function() {
                miniList.removeClass('hover');
            });
        }
    }

    /**
     * 初始化
     * @param {object} miniList 弹出菜单跟元素
     * @param {boolean} isSMenu 是否是小菜单
     */
    return function( miniLists, isSMenu ) {
        $( miniLists ).each(function() {
            init( $(this), isSMenu );
        });
    };
});
