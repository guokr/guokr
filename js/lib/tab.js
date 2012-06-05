/**
 * 简易的tab模块
 * @author mzhou
 * @version 1.2
 * @description 真的很简易
 *              根据trigger和target一一对应的切换
 * @log 1.1 添加了targetSelector,与前一版本不再兼容
 *      1.2 添加了callback回调，参数为currentTrigger（当前tab的jquery对象）、currentPanel（当前panel的jquery对象）
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'tab', function() {
    'use strict';
    return function( triggerPanel, triggerSelector, targetPanel, targetSelector, currentClass, callback ) {
        var panel = $(targetPanel).children( targetSelector ),
            tab = $(triggerPanel),
            trigger = tab.find( triggerSelector ),
            now = 0;
        tab.delegate( triggerSelector, "click", function(e) {
            e.preventDefault();
            var n = trigger.index( this );
            if ( now === n ) {
                return;
            } else {
                now = n;
            }
            var currentTrigger = $(this),
                currentPanel   = panel.eq(now);
            if ( callback && !callback( currentPanel, currentTrigger ) ) {
                return;
            }
            trigger.removeClass( currentClass );
            currentTrigger.addClass( currentClass );
            panel.hide();
            currentPanel.show();
        });
        
        return {
            current:function() {
                return now;
            },
            set:function( _now ) {
                trigger.eq( _now ).click();
                now = _now;
            }
        }
    }
});


