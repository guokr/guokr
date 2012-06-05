/**
 * 提示组件，用于页面上的小tip。例如第一次登录时候的“今日推荐”链接下的提示
 * @eg:
 *      toolTip( container, option, closeCallback );
 *      container 为position为relative的祖先元素
 *      option = {
 *          msg: 显示的html
 *          position: 坐标值[top,left]
 *          coordinates: 相对坐标系，jquery对象或选择符，提示的坐标值是相对于coordinates和position计算得到，可选
 *          direction: 小箭头的方向:up,down,left,right，默认为up
 *          offset: 小箭头与提示框的偏移距离，用于调整小箭头位置，默认为0
 *          width: 宽度
 *          noscroll: 是否不滚动
 *      },
 *      closeCallback 关闭时候的回调函数
 *
 * @log 0.1 fix z-index bug;
 *          fix show在scroll完成之后导致的bug
 *      0.2 添加了是否不滚动参数
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "scrollTo.js";
G.def( 'toolTip', ['scrollTo'], function( scrollTo ) {
    'use strict';
    var html = '<div style="position:absolute;z-index:999;padding:9px;background-color:#FFFED8;border:1px solid #B2B196;box-shadow:3px 3px 0 rgba(0,0,0,0.15);border-radius:1px;">\
                    {msg}\
                    <b style="{pointBStyle}"><s style="{pointSStyle}"></s></b>\
                </div>',
        offsets = {
            up: 'left',
            down: 'left',
            right: 'top',
            left: 'top'
        },
        pointBStyles = {
            up: 'top:-20px;border-bottom-style:solid;border-bottom-color:#B2B196;',
            down: 'bottom:-20px;border-top-style:solid;border-top-color:#B2B196;',
            right: 'right:-20px;border-left-style:solid;border-left-color:#B2B196;',
            left: 'left:-20px;border-right-style:solid;border-right-color:#B2B196;'
        },
        pointSStyles = {
            up: 'top:-8px;left:-9px;border-bottom-style:solid;border-bottom-color:#FFFED8;',
            down: 'top:-10px;left:-9px;border-top-style:solid;border-top-color:#FFFED8;',
            right: 'top:-9px;left:-10px;border-left-style:solid;border-left-color:#FFFED8;',
            left: 'top:-9px;left:-8px;border-right-style:solid;border-right-color:#FFFED8;'
        },
        toolTip = function( container, option, closeCallback ) {
            var msg = option.msg,
                position = option.position,
                coordinates = $(option.coordinates),
                direction = option.direction || 'up',
                offset = option.offset || 0,
                width = option.width,
                $con = $(container),                    // 容器
                conOffset = $con.offset(),
                $toolTip = $(G.format(html, {        // tooltip
                                msg: msg,
                                direction: direction,
                                pointSStyle: 'position:absolute;border-width:9px;border-color:transparent;border-style:dashed;width:0;height:0;font-size:0;'+pointSStyles[direction],
                                pointBStyle: 'position:absolute;border-width:10px;border-color:transparent;border-style:dashed;width:0;height:0;font-size:0;'+pointBStyles[direction]
                            }));
            $con.css('position','relative');
            // 显示toolTip
            function show() {
                $toolTip.css({
                    top: position[0],
                    left: position[1],
                    width: width
                });
                $( 'b', $toolTip ).css( offsets[direction], offset );
                $con.append( $toolTip );
            }
            // 移除此toolTip
            function remove() {
                $toolTip.remove();
                closeCallback();
            }

            if ( coordinates.length ) {
                coordinates = coordinates.position();
                position[0] += coordinates.top;
                position[1] += coordinates.left;
            }
            show();
            if ( !option.noscroll ) {
                scrollTo({
                    top: position[0]+conOffset.top + (direction === 'up' ? (-10) : 0),      // 处理箭头的位置
                    left: position[1]+conOffset.left + (direction === 'left' ? (-10) : 0)
                }); // NOTE： 注意不能设置成scroll结束后显示，因为会与其他的scroll冲突。导致show之前去获取新增html节点，会产生bug
            }
            return {
                remove: remove,
                $toolTip: $toolTip
            };
        };
    return toolTip;
});
