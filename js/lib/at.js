/**
 * @功能模块，用于显示@框，然后搜索选择昵称，最终执行回调
 * @author: mzhou
 * @log 0.1
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false, api:false */

//@import "tmpl.js";
//@import "Menu.js";
//@import "Trie.js";
//@import "TextUtils.js";
G.def( 'at', ['tmpl','Menu','Trie','TextUtils'], function( tmpl, Menu, Trie, TextUtils ) {
    'use strict';
    var html = '<div class="gui-at"><input class="b_txt"/><div></div></div>',
        listTmpl = '<% if(tip) { %><p><%=tip%></p><% } %><% if (noneTip) { %><p class="gui-at-none"><%=noneTip%></p><% } %>',
        $view,
        $body,
        $root,
        $input,
        $list,
        successCallback,
        failCallback,
        showed = false,
        menu,
        trie,
        blackList = /[^\u3400-\u4db5\u4e00-\u9fcba-zA-Z0-9._\-]/g,          // 不符合规范的昵称正则
        notSearchList = /[^\u3400-\u4db5\u4e00-\u9fcba-z0-9]/g,             // 不会被用来搜索的昵称正则
        i18n = {
            tip: '输入对方昵称来@TA',
            loadFailTip: '获取失败，请刷新页面重试',
            loadingTip: '<img src="/skin/imgs/loading.gif" style="float:left;margin:6px 5px 0 0;"/>获取用户列表中...',
            noneTip: '关注列表无匹配，回车键确认输入'
        };

    /**
     * body的click绑定，点击其他地方则隐藏框
     */
    function bodyClick( e ) {
        if ( !$.contains( $root[0], e.target ) ) {
            done();
        }
    }

    /**
     * init: 加载html,和其他事件，只执行一次
     */
    function init() {
        if ( init.inited ) {
            return;
        }
        $body = $('body');
        $root = $(html).appendTo($body);
        $input = $root.children('input');
        $list = $root.children('div');
        // 初始化trie树
        trie = new Trie(
            api.getFriendList,          // 获取的api
            // 去掉不符合白名单的字符
            function( old ) {
                return old.toLowerCase().replace(notSearchList, '');
            },
            // 加载完成之后
            function( data ) {
                $list.html( tmpl( listTmpl, {
                    tip: data == null ? null : i18n.tip,
                    noneTip: data == null ? i18n.loadFailTip : null
                }) );
                if( menu ) {
                    menu.remove();
                }
                return data;
            });
        // 菜单上下回车esc事件绑定
        var isMenuUpDown = false;   // 是否是特殊按键触被使用
        $input.keydown(function( e ) {
            switch (e.which) {
                // enter
                case 13:
                    e.preventDefault();
                    done( $input.val() );
                    isMenuUpDown = false;
                    break;
                // esc
                case 27:
                    e.preventDefault();
                    done();
                    isMenuUpDown = false;
                    break;
                // down
                case 40:
                    if ( menu ) {
                        isMenuUpDown = true;
                        e.preventDefault();
                        menu.down();
                    }
                    break;
                // up
                case 38:
                    if ( menu ) {
                        isMenuUpDown = true;
                        e.preventDefault();
                        menu.up();
                    }
                    break;
                // backspace
                case 8:
                    if ( $input.val().length === 0 ) {
                        e.preventDefault();
                        done();
                    }
                    isMenuUpDown = false;
                    break;
                default:
                    // 中文不能触发keypress、keyup。
                    // 而且在showAtList里面做过滤，chrome下会导致光标插入在div开头或是在textarea里面没光标
                    // 必需放在keydown里面，或者有非文字输入的按键发生
                    setTimeout(function() {
                        var v = $input.val();
                        /**
                         * win：QQ拼音、搜狗拼音、谷歌拼音、智能ABC、微软拼音、五笔
                         * mac：QQ拼音、搜狗拼音、FIT、QIM、系统自带拼音输入法
                         * linux：sunpinyin、ibus、fcitx
                         */
                        if ( v && v.slice(v.length-1).match(blackList) ) {    // FIX特殊输入法，会在输入中文过程中将输入的英文放到input中，并且会加入一些分割符号，例如：“'”和“ ”等。发生在高版本的FIT和Mac默认输入法
                            v = v.replace(blackList, '');
                            done(v);
                        }
                    });
                    isMenuUpDown = false;
                    break;
            }
        });

        // 联想的绑定
        if ( window.addEventListener ) {
            // input有输入的时候执行
            $input[0].addEventListener('input', function() {
                showAtList( $input.val() );
            }, false); // 必须设置不使用事件捕获，否则会在firefox 5.0.1上与百度统计冲突，fuck baidu，什么垃圾代码
        } else if ( window.attachEvent ) {
            // input值改变的时候执行
            $input[0].attachEvent('onpropertychange', function() {
                if ( !isMenuUpDown && window.event.propertyName == 'value' ) {
                    showAtList( $input.val() );
                }
            });
        }
        init.inited = true;
    }

    /**
     * 显示联想的昵称列表
     * @param {string} search 输入的字符串
     */
    function showAtList( search ) {
        var noneTip = null,
            tip = null;
        trie.calculate( search, function( data ) {
            if ( trie.isFailed() ) {
                noneTip = i18n.loadFailTip;
            } else if ( trie.isLoading() ) {
                tip = i18n.loadingTip;
            } else if ( data == null ) {
                tip = i18n.tip;
            } else if ( data.length === 0 ) {
                noneTip = i18n.noneTip;
            }
            $list.html( tmpl( listTmpl, {
                tip: tip,
                noneTip: noneTip
            }) );
            if( menu ) {
                menu.remove();
            }
            if ( data && data.length > 0 ) {
                data = data.slice(0,10);    // 只显示10个
                menu = new Menu( $list, data, function( name ) {
                           done( name );
                       }, {
                           useFocus: true,
                           disableMouseChangeEvent: true
                       } )
                       .onChange(function( value ) {
                           $input.val( value );
                       })
                       .onHide(function() {
                           $input.insertCaret();
                       });
            }
        });
    }

    /**
     * 选中昵称之后执行
     * @param {string} name 昵称
     */
    function done( name ) {
        if ( name === '妹子' ) {
            alert('﹁_﹁，出门右转是性情！');
        }
        $root.css('left',-99999);   // NOTE 不能用hide来隐藏，会导致sougou等输入法在隐藏输入框之后，在@的时候呼出不了输入法
        if ( name ) {
            successCallback( name + ' ' );
        } else {
            failCallback();
        }
        $body.unbind( 'click', bodyClick );
        $view && $view.unbind( 'click', bodyClick );
        showed = false;
    }

    /**
     * 启动@功能
     * @param {obj} pos 位置对象{top:11,lef:12}
     * @param {function} success 选中@的昵称之后执行的函数
     * @param {function} fail 未选中且结束@之后执行的函数（esc和外部点击事件可以触发）
     * @param {object} _$view 编辑器iframe中的body
     */
    return function at( pos, success, fail, _$view ) {
        if ( showed ) {
            return;
        }
        showed = true;
        successCallback = success;
        failCallback = fail;
        if ( _$view ) {
            $view = _$view;
        }
        setTimeout(function() { // for opera to show @, when click @ button
            init();
            $root.css({
                    'top': pos.top,
                    'left': pos.left,
                    'display': 'block'
                 });
            $input.val('')
                  .focus();
            showAtList();
            $body.click(bodyClick);
            $view && $view.click(bodyClick);
        });
    };
});
