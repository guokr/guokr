/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false, g_obj_id:true */

G.def('Trie', function() {
    'use strict';
    var level = G.ua.isIE6 ? 3 : 5; // 遍历查找层数，和返回的trie数层数

    /**
     * 修复因为输入超长字符，而导致的错误匹配
     * @param {array} data 错误数据
     * @param {string} search 搜索字符串
     * @return {array} 去掉错误后的结果
     */
    function fixMisMatch( data, search ) {
        var result = [];
        for ( var i=0,l=data.length; i<l; i++ ) {
            if( data[i].indexOf( search ) !== -1 ) {   // 匹配的情况较少，多数是多余的匹配，所以不新建临时变量存data[i]
                result.push( data[i] );
            }
        }
        return result;
    }


    /**
     * 移除重复的昵称，注意解决不了[2,"2"]会被判为重复的问题。不过用在此处无害
     * @param {array} data 输入数组
     * @return {array} 输出数组
     */
    function removeRepeatNick( data ) {
        var result = [],
            status = {},
            now;
        for ( var i=0,l=data.length; i<l; i++ ) {
            now = data[i];
            if ( !status[now] ) {
                result.push(now);
                status[now] = true;
            }
        }
        return result;
    }

    /**
     * 计算trie数搜索
     * @param {object} data tire树数据
     * @param {string} search 被搜索的字符串
     * @param {function} cb 回调函数,输入为结果数组
     * @param {function} wordFilter 搜索字符的过滤转换函数
     */
    function trieCal( data, search, cb, wordFilter ) {
        var fdata = [];
        // fix IE memory leak:
        //      http://bbs.51js.com/viewthread.php?tid=70162&extra=&highlight=%C4%DA%B4%E6%2Bdron&page=1
        search = new String(search);
        function findTrieWord( word, len, cur ) {
            // 搜索字母全都可以找到匹配，那么在往下遍历level-len层
            if ( word.length === 0 ) {
                findLevel( cur, level-len );
                return;
            }
            // 遍历进入子树，并搜索完全匹配
            var c;
            if ( c = cur[ word.slice(0,1) ] ) {
                // 搜到最后一位后，有完全匹配，则添加
                if ( c.$ && word.length === 1 ) {
                    fdata = fdata.concat( c.$ );
                }
                // 进入子树
                findTrieWord( word.slice( 1 ), len, c );
            } else if ( cur.$ ) {
                // 如果是没有找到匹配子树，则直接显示当前树的结果“$”，用于处理输入的搜索字符长度超过level的情况
                fdata = fdata.concat( fixMisMatch( cur.$, search ) );
            }
        }
        // 模糊匹配，往下查找l层
        function findLevel( cur, l ) {
            if ( l === 0 ) {
                return;
            }
            var c;
            for ( var node in cur ) {
                c = cur[node];
                if ( c.$ ) {
                    fdata = fdata.concat( c.$ );
                }
                findLevel( c, l-1 );
            }
        }
        if ( wordFilter ) {
            search = wordFilter( search );
        }
        findTrieWord( search, search.length, data );
        cb( removeRepeatNick(fdata) );
    }

    /**
     * Tire初始化
     * @param {function/object} source 如果是函数则用于获取trie数，如果是object则就是trie数
     * @param {function} wordFilter 搜索字符的过滤转换函数
     * @param {function} afterLoading loading结束后执行的函数，可以用来修改返回数据
     */
    return function( source, wordFilter, afterLoading ) {
        var data,
            loading = false,
            failed = false,
            searchParam,
            callback;
        if ( typeof g_obj_id === 'undefined' ) {
            g_obj_id = '';
        }
        // 开始加载
        if ( G.isFun(source) ) {
            if ( !loading ) {
                loading = true;
                source(level, (G.ua.isIE6 ? '' : g_obj_id), function( _data ) {
                    // 获取成功
                    loading = false;
                    data = afterLoading ? afterLoading(_data) : _data;
                    if ( searchParam && callback ) {
                        trieCal( data, searchParam, callback, wordFilter );
                    }
                }, function() {
                    // 获取失败
                    failed = true;
                    loading = false;
                    if (afterLoading) {
                        afterLoading();
                    }
                });
            }
        } else {
            data = source;
        }

        /**
         * 计算trie树搜索
         * @param {string} search 搜索值
         * @param {function} cb 回调函数
         */
        this.calculate = function( search, cb ) {
            // 没有搜索字符或者没有加载成功
            if ( !search || failed ) {
                cb();
                return;
            }
            // 正在加载
            if ( loading ) {
                searchParam = search;
                callback = cb;
            // 计算结果
            } else {
                trieCal( data, search, cb, wordFilter );
            }
        };
        /**
         * 判断载入是否正在进行
         */
        this.isLoading = function() {
            return loading;
        };
        /**
         * 判断是否加载失败
         */
        this.isFailed = function() {
            return failed;
        };
    };
});
