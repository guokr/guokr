/**
 * 自动补全插件，扩展自Event。
 * 提供了show/hide/open/close/select五种事件，不支持return false来阻止事件
 * @author mzhou
 * @eg  var a = autoComplete( $input, api.getSimilarQuestion, {     // api是返回数组的函数,参数为value和回调函数(传递补全列表参数)，如果是ajax api则还需要返回xhr。
 *                  done: function(){},                             // 选中菜单项后的回调函数，默认为设置input的值
 *                  convert: function() {},                         // 将api返回的数组项，转换成可显示和可用来设置input值的菜单项。默认为数组项 === 菜单项
 *                  width: 100,                                     // 补充框的宽度,默认不设置
 *                  limit: 3,                                       // 至少多少个字输入后，才会自动补全，默认为2
 *                  tip: '提示',                                    // 提示的html，显示在menu上面
 *                  afterSetup: function(){},                       // 设置完成后的回调函数
 *                  intervalTime: 3000                              // 更新自动补全列表的间隔时间，默认为3000
 *              });
 *      a.show(function() {     // 显示autoComplete菜单
 *          console.log('afterShow');
 *      });
 *      a.hide();               // 隐藏
 *      a.close();              // 关闭，无法再显示菜单，除非再次打开
 *      a.open();               // 打开
 *      a.on('show', function() {           // show/hide/close/open 四种事件的回调都没有参数
 *          console.log('show');
 *      });
 *      a.on('select', function( item ) {   // select事件在选中自动补全选项时触发(支持return false回调)，之后会触发done回调
 *          console.log( item );
 *      });
 * @log 0.1
 *      0.2 添加esc隐藏自动补全按钮
 *
 *
 *
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "Menu.js";
//@import "Event.js";
G.def('autoComplete', ['Menu', 'Event'], function(Menu, Event) {
    'use strict';
    var customMenuClass = 'gui-autocomplete-menu';

    /**
     * 设置自动补全
     * @param {object} $input jquery object for input
     * @param {function/array} api 获取补全列表的函数,参数为value和回调函数(传递补全列表参数)，如果是ajax api则还需要返回xhr。
     * @param {object} option 可选项
     *                          done 选中菜单项后的回调函数，默认为设置input的值
     *                          convert 将api返回的数组项，转换成可显示和可用来设置input值的菜单项。默认为数组项 === 菜单项
     *                          width 补充框的宽度,默认为input的宽度
     *                          limit 至少多少个字输入后，才会自动补全
     *                          tip 提示的html，显示在menu上面，有tip的时候才会有close按钮
     *                          afterSetup 设置完成后的回调函数
     *                          intervalTime 更新自动补全列表的间隔时间，默认为1000
     */
    function AutoComplete($input, api, option) {
        var inputPos, // 输入框的坐标
        width, // 菜单的宽度
        isMouseOnMenu = false,
            // 鼠标是否在菜单上
            isFocusInput = false,
            // 输入框是否是focus状态
            self = this,
            wrap = '<div style="position:relative;z-index:1;_zoom:1;" class="gui-autocomplete"></div>',
            // 外包装，确保$input位置修改后也不会影响到菜单
            interval, // timeout句柄
            intervalTime = option.interval || 1000,
            // 请求的间隔时间
            $wrap;
        this.$input = $input; // input输入
        this.option = option; // 可选项
        this.api = api; // api
        this.$container = $('<div style="position:absolute;z-index:9999;display:none;">' + (option.tip ? '<div style="color: #666;margin-bottom: -1px;background:#FFF;position: relative;z-index:1;border:1px solid #C5C5C5;border-bottom:none;">\
                                 <div style="margin:0 5px;padding: 5px 0;overflow: hidden;zoom:1;border-bottom: 1px dotted #CCC;">\
                                     <p class="fl">' + option.tip + '</p>\
                                     <a class="icon-close fr" href="javascript:void 0;" data-operation="closeMenu">X</a>\
                                 </div>\
                             </div>' : '') + '</div>'), // 容器
        this.oldAutoCompleteAttr = this.$input.attr('autoComplete'), // input默认的autoComplete值
        this._close = false, // 是否是关闭状态
        this.option.limit = option.limit || 2; // 限制输入n个字之后才开始自动补全
        this.isMenuUpDown = false; // 是否是特殊按键触被使用
        this.oldValue = ''; // input的上一次使用于搜索的值
        this.ajax = null; // ajax xhr
        this.lastMatchValue = ''; // 最后一次匹配成功的搜索词
        self.$input.wrap(wrap);
        $wrap = $input.parent();
        inputPos = self.$input.position();
        width = self.option.width || self.$input.outerWidth();
        self.$container.insertAfter(self.$input);
        self.$container.css({
            'top': inputPos.top + self.$input.outerHeight(),
            'left': inputPos.left,
            'width': width
        }).mouseenter(function() {
            isMouseOnMenu = true;
        }).mouseleave(function() {
            isMouseOnMenu = false;
            if (isFocusInput) {
                return;
            } else if (self.menu) {
                self.menu.remove();
                self.menu = null;
            }
        });
        // 关闭默认自动补全
        if (self.oldAutoCompleteAttr !== 'off') {
            self.$input.attr('autoComplete', 'off');
        }
        self.$input.keydown(function(e) {
            if (self._close) {
                return;
            }
            switch (e.which) {
                // esc
            case 27:
                self.hide();
                break;
                // enter
            case 13:
                if (self.menu && self.menu.select()) {
                    e.preventDefault();
                    self.menu.done();
                }
                break;
                // down
            case 40:
                if (self.menu) {
                    e.preventDefault();
                    self.menu.down();
                }
                break;
                // up
            case 38:
                if (self.menu) {
                    e.preventDefault();
                    self.menu.up();
                }
                break;
            default:
                break;
            }
        }).blur(function(e) {
            // 避免点击的时候，menu已经被remove了的
            if (self._close || isMouseOnMenu) {
                return;
            }
            if (interval) {
                clearTimeout(interval);
                interval = null;
            }
            isFocusInput = false;
            self.hide();
        }).focus(function() {
            if (self._close) {
                return;
            }
            // focus之后立即查找，查找结束后过指定间隔时间，再次请求查找。确保每次只有一个链接数。
            function search() {
                self._autoComplete(function() {
                    interval = setTimeout(search, intervalTime);
                });
            }
            // 如果搜索词没有改变，则不重置
            if (self.lastMatchValue !== self.$input.val()) {
                self._reset();
            }
            self.show(function(data) {
                search();
            });
            isFocusInput = true;
        });
        $wrap.delegate('[data-operation=closeMenu]', 'click', function(e) {
            e.preventDefault();
            self.close();
        });
        // click其他地方可以关闭菜单
        $('body').click(function(e) {
            if (self._close) {
                return;
            }
            if (!$.contains($wrap[0], e.target)) {
                self.hide();
            }
        });
        if (option.afterSetup) {
            option.afterSetup.call(this);
        }
    }
    Event.extend(AutoComplete);

    // 重置autoComplete
    AutoComplete.prototype._reset = function() {
        if (this.menu) {
            this.menu.remove();
        }
        this.menu = null;
        this.oldValue = '';
    };
    AutoComplete.prototype.close = function() {
        this.fire('close');
        this._close = true;
        this.$input.attr('autoComplete', this.oldAutoCompleteAttr);
        this.hide();
        return this;
    };
    AutoComplete.prototype.open = function() {
        this.fire('open');
        this._close = false;
        if (this.oldAutoCompleteAttr !== 'off') {
            this.$input.attr('autoComplete', 'off');
        }
        return this;
    };
    // 获取自动补全数据
    AutoComplete.prototype._autoComplete = function(callback) {
        var self = this;
        if (self._close) {
            return this;
        }
        var value = self.$input.val();
        // 显示菜单
        function showMenu(data) {
            // 没有匹配
            if (data.length === 0) {
                self.hide();
            } else {
                var convert = self.option.convert;
                if (self.menu) {
                    self.menu.remove();
                }
                self.menu = new Menu(
                self.$container, data, function(item) {
                    if (!self.fire('select', item)) {
                        return;
                    }
                    if (self.option.done) {
                        self.option.done.apply(this, arguments);
                    } else {
                        self.$input.val(convert ? convert(item) : item);
                    }
                }, {
                    convert: convert,
                    className: customMenuClass
                }).onRemove(function() {
                    self.hide();
                });
                self.lastMatchValue = value;
                self.$container.show();
            }
        }
        if (value.length >= self.option.limit && self.oldValue !== value) {
            self.oldValue = value;
            // 确保每次只有一个链接数
            if (self.ajax) {
                self.ajax.abort();
            }
            self.ajax = self.api(value, function(data) {
                showMenu(data);
                if (callback) {
                    callback.call(self);
                }
            });
        } else if (self.oldValue === value) {
            if (callback) {
                callback.call(self);
            }
        } else {
            self.oldValue = value;
            self.hide();
            if (callback) {
                callback.call(self);
            }
        }
        return this;
    };
    AutoComplete.prototype.show = function(afterCallBack) {
        this.fire('show');
        var self = this;
        if (self._close) {
            return this;
        }

        if (self.menu) {
            self.$container.show();
            if (afterCallBack) {
                afterCallBack.call(self);
            }
        } else {
            self._autoComplete(afterCallBack);
        }
        return this;
    };
    AutoComplete.prototype.hide = function() {
        this.fire('hide');
        this.$container.hide();
        return this;
    };

    return function($input, api, option) {
        return new AutoComplete($input, api, option);
    };
});
