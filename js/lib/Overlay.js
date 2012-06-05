/**
 * 用于替代block2的浮层库，解决了block2的openCallback等回调函数在多个浮层之间调用混乱的缺点
 * 依赖的css已经在h/comment.css中的 @blockWindow 模块中
 *  
 * 用例：
 *      新建实例:
 *              var block = new Overlay();
 *      新建实例的同时打开弹出框：
 *              var block = new Overlay(
 *                      // html或者是iframe链接地址
 *                      '框中显示的html', 
 *                      // 设置在窗口上的事件代理对象，或者是多个对象（即对象数组，多个代理）
 *                      { event:'click',selector:'#id',func:func },
 *                      // 打开后的回调，自0.7版本开始，多次回调可以使用afterOpen代替，不过任就可以作为一次性回调的情况下使用。
 *                      function() {
 *                           console.log('afterOpen');
 *                      });
 *      打开弹出框:
 *              block.open( 
 *                      // html或者是iframe链接地址
 *                      '框中显示的html', 
 *                      // 设置在窗口上的事件代理对象，或者是多个对象（即对象数组，多个代理）
 *                      { event:'click',selector:'#id',func:func },
 *                      // 打开后的回调
 *                      function() {
 *                           console.log('afterOpen');
 *                      });
 *      设置回调：
 *              函数的this都为block对象
 *              函数的参数都为数组：[ $blockWindow, $blockContent ]
 *              block.openCallBack(function() {});  // 打开之前的回调函数,return false可以阻止打开
 *              block.closeCallBack(function() {}); // 关闭之前的回调函数,return false可以阻止关闭
 *              block.afterOpen(function() {});     // 打开之后的回调函数
 *              block.afterClose(function() {}):    // 关闭之后的回调函数
 *      设置title:
 *              block.title( '新标题' );
 *      关闭窗体:
 *              block.close();
 *      是否打开：
 *              block.isOpen();
 *      重新定位窗体的位置：
 *              block.pos();
 *      设置或获取宽度(不算padding\margin\border)：
 *              block.width( 100 );
 *              block.width();
 *      设置当前浮层不跟随窗口滚动[fixed](只要浏览器支持position:fixed)
 *              block.pin();
 *      设置当前浮层随窗口滚动[absolute]
 *              block.unpin();
 *      
 * @author: mzhou
 * @log: 0.1
 *       0.2 支持open和初始化方法直接输入地址，输出iframe的方式
 *       0.3 增加width方法设置宽度，并增加api注释，修复了多个实例可以相互控制对方title的bug，修复了打开一个新窗口是undelegate不被执行的bug
 *       0.4 增加取消fix定位的功能： pin 和 unpin 函数
 *       0.5 修改pos方法，使其根据fixed状态来计算。并且在pin/unpin方法中，重新计算位置
 *       0.6 fix 弹出框closeCallBack返回false阻止关闭事件后无法第二次触发closeCallBack的bug
 *       0.7 使用Event组件重写了事件部分，并增加了afterOpen和afterClose两个api
 *       0.8 fix了同一个实例open两次时，先关闭再重新打开的bug。这回触发一次close事件
 *       0.9 增加了showCover和hideCover两个方式，支持了背景cover。
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */
//@import "Event.js";
//@import "support.js";
G.def('Overlay', ['support', 'Event'], function(support, Event) {
    'use strict';
    var guid = 0,
        blockWindow = '<div id="blockWindow" class="gui-block">\
                           <div class="gui-block-b">\
                               <h4 class="gui-block-hd">\
                                   <span id="blockTitle"></span>\
                                   <a class="blockClose gui-block-close" href="#" title="关闭">X</a>\
                               </h4>\
                               <div id="blockContent" class="gui-block-bd"></div>\
                           </div>\
                       </div>',
        // 弹出框选择符或者html string
        iframeTmpl = '<iframe src="{v}" frameborder="0" width="100%"></iframe>',
        $window = $(window),
        blockContent = '#blockContent',
        // 弹出框中的可变内容
        blockTitle = '#blockTitle',
        // 标题selector
        blockClose = '.blockClose',
        // 关闭元素选择符
        supportFixed, $blockWindow, $blockContent, $blockTitle, $cover, now, // 现在正在显示的Overlay实例
        arg; // 所有回调函数的参数:[$blockWindow,$blockContent]
    /**
     * 重新定位block位置
     */
    function rePosition(isAbsolute) {
        var top, left;
        if (isAbsolute) {
            top = ($window.height() - $blockWindow.height()) / 2 + (document.documentElement.scrollTop || (window.pageYOffset || 0));
            left = ($window.width() - $blockWindow.width()) / 2 + (document.documentElement.scrollLeft || (window.pageXOffset || 0));
        } else {
            top = ($window.height() - $blockWindow.height()) / 2;
            left = ($window.width() - $blockWindow.width()) / 2;
        }
        $blockWindow.css({
            'top': top,
            'left': left
        });
    }

    /**
     * 显示cover
     * @param {number/string} opacity 透明度
     * @param {string} color 背景颜色
     */
    function showCover(opacity, color) {
        if ($cover && $cover.length) {
            $cover.css({
                'opacity': opacity || 0.5,
                'background-color': color || '#000'
            }).show();
        }
    }

    /**
     * 隐藏cover
     */
    function hideCover() {
        if ($cover && $cover.length) {
            $cover.hide();
        }
    }

    function ie6CoverOnScroll() {
        $cover.css({
            'top': (document.documentElement.scrollTop || (window.pageYOffset || 0)),
            'left': (document.documentElement.scrollLeft || (window.pageXOffset || 0))
        });
    }

    function ie6CoverOnResize() {
        $cover.css({
            'width': $window.width(),
            'height': $window.height()
        });
    }

    function ie6CoverInit() {
        if (G.ua.isIE6 && $cover && $cover.length) {
            $cover.css({
                'position': 'absolute',
                'bottom': 'auto',
                'right': 'auto'
            });
            ie6CoverOnResize();
            ie6CoverOnScroll();
        }
    }

    /**
     * 初始化
     */
    function init() {
        if (init.inited) {
            return;
        }
        init.inited = true;
        $blockWindow = $(blockWindow);
        $blockWindow.appendTo('body');
        $blockContent = $(blockContent);
        $blockTitle = $(blockTitle);
        arg = [$blockWindow, $blockContent];
        /* TODO: iPhone/iPad Hack*/
        if (navigator.userAgent.match(/iPad|iPhone/i) !== null) {
            /*Check if device runs iOS 5 or higher*/
            supportFixed = navigator.userAgent.match(/[5-9]_[0-9]/) !== null;
        } else {
            supportFixed = support.fixed();
            $window.resize(function() {
                if (now) {
                    now.pos();
                }
            });
        }

        if (G.ua.isIE6) {
            $window.resize(function() {
                if ($cover && $cover.length && now) {
                    ie6CoverOnResize();
                }
            }).scroll(function() {
                if ($cover && $cover.length && now) {
                    ie6CoverOnScroll();
                }
            });
        }

        //bind event
        $blockWindow.delegate(blockClose, 'click', function(e) {
            e.preventDefault();
            if (now) {
                now.close();
            }
        });
    }

    /**
     * 新建block，如果有参数则显示block
     * @param {string} html 内容框,或者是iframe链接地址
     * @param {array/object} objs 绑定事件设置 例如：对象数组[{event:'click',selector:'#id',func:func}]或者一个对象{event:'',selector:'',func:}
     * @param {function} afterOpen 显示内容之后的回调函数，只在有html参数时调用，用于给新添加的html做初始化，绑定无法delegate的事件
     */
    function Overlay(html, objs, afterOpen) {
        this._isOpen = false;
        init.call(this);
        this._fixed = supportFixed;
        this._coverNeedShowed = false;
        this._initedCover = false;
        if (html) {
            this.open(html, objs, afterOpen);
        }
    }

    Overlay.prototype = {
        /**
         * 设置打开时的回调参数
         * @param {function} cb 回调函数
         * @deprecated
         */
        openCallBack: function(cb) {
            if (cb) {
                this.on('open', cb, this);
            }
            return this;
        },
        /**
         * 设置关闭时的回调参数
         * @param {function} cb 回调函数
         */
        closeCallBack: function(cb) {
            if (cb) {
                this.on('close', cb, this);
            }
            return this;
        },
        /**
         * 设置关闭后的回调参数
         * @param {function} cb 回调函数
         */
        afterClose: function(cb) {
            if (cb) {
                this.on('afterClose', cb, this);
            }
            return this;
        },
        /**
         * 设置打开后的回调参数
         * @param {function} cb 回调函数
         */
        afterOpen: function(cb) {
            if (cb) {
                this.on('afterOpen', cb, this);
            }
            return this;
        },
        /**
         * 判断block是否现实
         */
        isOpen: function() {
            return this._isOpen;
        },
        /**
         * 关闭block
         */
        close: function() {
            if (!this._isOpen) {
                return this;
            }
            // 回调start
            if (!this.fire('close', arg)) {
                return this;
            }
            // 回调end
            $blockWindow.hide();
            this._isOpen = false;
            now = null;
            // after close
            this.fire('afterClose', arg);
            return this;
        },
        /**
         * 打开block
         * @param {string} html 内容框,或者是iframe链接地址
         * @param {array/object} objs 绑定事件设置 例如：对象数组[{event:'click',selector:'#id',func:func}]或者一个对象{event:'',selector:'',func:}
         * @param {function} afterOpen @deprecated 显示内容之后的回调函数，只在有html参数时调用，用于给新添加的html做初始化，绑定无法delegate的事件
         */
        open: function(html, objs, afterOpen) {
            // 回调start
            if (!this.fire('open', arg)) {
                return this;
            }
            // 回调end
            // 关闭旧窗口，但是如果本窗口打开两次则不会先关闭后打开
            if (now && (now !== this)) {
                now.close();
            }
            now = this;
            this.undelegate(); //先取消绑定再绑定新事件
            if (objs) {
                this.delegate(objs);
            }
            if (html && !G.isHtml(html)) {
                html = G.format(iframeTmpl, html);
            }
            $blockContent.html(html || ''); //小操作不用doOnce限制
            if (this._title) {
                $blockTitle.html(this._title); // 将保存的title值设置好
            }
            if (this._width) {
                $blockWindow.width(this._width); // 将保存的width值设置好
            }
            $blockWindow.css('position', (!this._fixed || !supportFixed) ? 'absolute' : 'fixed');
            this.pos();
            $blockWindow.show();
            this._isOpen = true;
            if (afterOpen) {
                afterOpen.call(this, $blockContent);
            }
            this.fire('afterOpen', arg);
            return this;
        },
        /**
         * 使用$.delegate绑定事件到blockContent上
         * @param {object/array} 绑定事件设置 例如：对象数组[{event:'click',selector:'#id',func:func}]或者一个对象{event:'',selector:'',func:}
         */
        delegate: function(objs) {
            if (!objs.length) {
                $blockContent.delegate(objs.selector, objs.event, objs.func);
                return;
            }
            G.each(objs, function(obj) {
                this.delegate(obj.selector, obj.event, obj.func);
            }, $blockContent);
            return this;
        },
        /**
         * 使用$.undelegate来解绑定blockContent上的事件
         */
        undelegate: function() {
            $blockContent.undelegate();
            return this;
        },
        /**
         * 重新设置窗口的位置
         */
        pos: function() {
            rePosition(!this._fixed || !supportFixed);
            if (G.ua.isIE6 && this._cover && this._cover.length) {
                this._cover.css();
            }
            return this;
        },
        /**
         * 设置弹出框的标题值
         * @param {string} title    标题值
         */
        title: function(title) {
            this._title = title;
            if (this._isOpen) {
                $blockTitle.html(title);
            }
            return this;
        },
        /**
         * 设置窗体宽度
         * @param {string/number} w 宽度
         * @return {object}
         */
        width: function(w) {
            this._width = w;
            if (this._isOpen) {
                $blockWindow.width(w);
                this.pos();
            }
            return this;
        },
        pin: function() {
            // 已经是fix了或不支持fix，则略过
            if (this._fixed || !supportFixed) {
                return;
            }
            // 还没有fix
            this._fixed = true;
            // 这个实例正是打开的情况
            if (this._isOpen) {
                $blockWindow.css('position', 'fixed');
                this.pos();
            }
            return this;
        },
        unpin: function() {
            // 已经没有fix了，则略过
            if (!this._fixed) {
                return;
            }
            // 已经fix了
            this._fixed = false;
            // 这个实例正是打开的情况
            if (this._isOpen) {
                $blockWindow.css('position', 'absolute');
                this.pos();
            }
            return this;
        },
        showCover: function(opacity, color) {
            // init cover
            if (!$cover || !$cover.length) {
                // 新建cover
                // z-index为blockWindow的值减1
                $cover = $('<div style="position:fixed;top:0;left:0;right:0;bottom:0;display:none;z-index:' + ((parseInt($blockWindow.css('z-index'), 10) || 0) - 1) + ';"></div>').appendTo('body');
                ie6CoverInit();
            }
            // init cover status
            if (!this._initedCover) {
                var self = this;
                // 随着此Overlay的打开而打开，关闭而关闭
                this.on('afterClose', function() {
                    if (self._coverNeedShowed) {
                        hideCover();
                    }
                }).on('afterOpen', function() {
                    if (self._coverNeedShowed) {
                        showCover();
                    }
                });
                this._initedCover = true;
            }
            showCover();
            this._coverNeedShowed = true;
            return this;
        },
        hideCover: function() {
            hideCover();
            this._coverNeedShowed = false;
            return this;
        }
    };
    Event.extend(Overlay);

    return Overlay;
});
