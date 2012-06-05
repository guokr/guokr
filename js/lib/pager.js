/**
 * 依赖于tmpl模块的分页模块
 * @author mzhou
 * @version 1.0
 * @description 主要方法是randUI和getPageSize
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'pager', ['tmpl'], function( tmpl ) {
    'use strict';
    var memo = {};
    return {
        getPageSize: function( /*@number 一共多少条目 */count, /*@number 每页多少条 */pageSize ) {
            var mod = count % pageSize;
            return mod ? Math.floor(count/pageSize) + 1 : Math.floor(count/pageSize);   
        },
        cal: function( /*@number 显示第几页 */now, /*@number 一共多少条目 */count, /*@number 每页多少条 */pageSize ) {
            var key = [now, count, pageSize].join(' ');
            if ( memo[key] ) { //计算过则用缓存
                return memo[key];
            }
            var pager;
            if ( count === 0 ) {
                pager = {now:0};
            }
            else {
                var size = this.getPageSize( count, pageSize);
                if ( now <= 0 ) {
                    now = 1;
                }
                if ( now > size) {
                    now = size;
                }
                pager = {
                    now: now,
                    all: size,
                    first: now === 1,
                    last: now === size
                };
                if (size > 8) {
                    pager.start = now-4;
                    pager.end = now+4;
                    if ( pager.start <= 1 ) {
                        pager.end = pager.end - pager.start;
                        pager.start = 1;
                    }
                    if ( pager.end >= size ) {
                        pager.start = pager.start - pager.end + size;
                        pager.end = size;
                    }
                }
                else {
                    pager.start = 1;
                    pager.end = size;
                }
            }
            return memo[key] = pager;
        },
        clear: function() {
            memo = {};
        },
        rendUI: function( /*@string selector of place to show*/place, 
                          /*@string 模板的id*/tmplateId, 
                          /*@number 显示第几页 */now, 
                          /*@number 一共多少条目 */count, 
                          /*@number 每页多少条 */pageSize, 
                          /*@string */linkString ) {
            var data = this.cal(now, count, pageSize);
            data.linkString = linkString || '#page={n}';
            var html = tmpl( tmplateId )( data );
            $(place).html(html);
            return html;
        }
    };
});


