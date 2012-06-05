/**
 * 模拟菜单的组件
 *      有“选择值修改”和“选择完成”两个事件，选择完成事件只能绑定一次
 *      只有当useFocus参数为true时，才会有focus方法，才会支持按键tab
 *      注意: 菜单一旦初始化结束就无法修改菜单项，所以如果是经常变化的菜单，请在done方法中remove，然后新建菜单；
 *            如果想重复使用菜单，但又希望菜单暂时消失，请使用hide方法；
 *
 * @eg:
 *      var menu = new Menu( 
 *              $container,                 // 容器 jQuery 对象
 *              [12,123],                   // 菜单数据
 *              function( value ) {         // 【可选】选择完成后的回调
 *                  console.log( value );
 *                  console.log( this === menu );
 *              },
 *              {
 *                  useFocus: true,                         // 【可选】使用focus
 *                  convert: function( item ) {             // 【可选】将data中的数据项转换成显示用的菜单项，没有则默认用data的值
 *                      console.log( this === menu );
 *                      return item.name;
 *                  },
 *                  className: 'gui-autocomplete-menu'
 *              }
 *          );
 *      menu.select( 2 )                    // 选择二项，如果超过则设置为不选择
 *          .up()                           // 选择下一项
 *          .down()
 *          .focus()
 *          .onChange(function( value ) {   // 选择值修改事件，包括由选中变到不选中（-1）的状态
 *              console.log( value );
 *              // return false;
 *          })
 *          .select();
 *      menu.show()
 *          .hide()
 *          .remove();
 *
 * @log 0.1 刚新建
 *      0.2 增加onChange方法，用于注册选择项修改时候的事件，返回false则会阻止修改
 *          修改up/down方法，使其循环的上下选择（即down方法，当前为最后一个时，下一次选择的是第一个）
 *          增加convert参数，用于将data中的数据项转换成显示用的菜单项，没有则默认用data的值
 *          修改useFocus和convert参数到option中,注意api和以前不兼容了
 *          修证了在li被click的时候，会修改selected值，原来不修改直接调用done回调函数
 *          修改了remove方法，使其会delete掉所有属性值
 *          添加了done方法，调用它可以直接触发doneCallBack，并且remove掉menu
 *          使用了Event组件实现事件
 *      0.3 设置done回调为可选
 *          fix keydown enter时候的bug
 *      0.4 fix了done为函数时候的bug，把option也设置成null了，太失误了
 *      0.5 增加参数：disableMouseChangeEvent 取消鼠标选中时激活change事件
 *      0.6 修改参数：disableMouseChangeEvent 使得mouseleave的时候也会受此次数控制
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "tmpl.js";
//@import "Event.js";
G.def( 'Menu', ['tmpl','Event'], function( tmpl, Event ) {
    'use strict';
    var menuTmpl = '<div class="gui-menu <%=className%>">\
                        <% if (useFocus) { %>\
                            <a href="#" tabindex="0" hidefocus="true" class="gui-menu-focus">&nbsp;</a>\
                        <% } %>\
                        <ul class="gui-menu-list">\
                            <% for (var i=0;i<list.length;i++) { %>\
                            <li>\
                                <% if (typeof convert !== "undefined") { %>\
                                    <%=convert(list[i])%>\
                                <% } else { %>\
                                    <%=list[i]%>\
                                <% } %>\
                            </li>\
                            <% } %>\
                        </ul>\
                    </div>';

    /**
     * new Menu() 初始化菜单
     * @param {object} $container 菜单的容器
     * @param {array} data 菜单的数据，是一个数组
     * @param {function} done 【可选】选择完成后回调参数，给予选择的值
     * @param {object} option 可选项
     *                        useFocus 【可选】是否使用focus
     *                        convert 【可选】将data中的数据项转换成显示用的菜单项，没有则默认用data的值
     *                        className 【可选】增加设置menu的class，用于样式修改
     *                        disableMouseChangeEvent 【可选】取消鼠标选中时激活change事件
     */
    function Menu( $container, data, done, option ) {
        if ( !G.isFun(done) ) {
            option = done;
            done = null;
        }
        this.$menu = $( tmpl( menuTmpl, {list: data, useFocus: option.useFocus, convert: option.convert, className: option.className||''} ) ); // 菜单
        this.$list = this.$menu.find('li');                                                     // 菜单选择项
        this.selected = -1;                                                                     // -1为未选择，选择则从0开始
        this.data = data;                                                                       // 数据数组
        this.doneCallBack = done;                                                               // 选择完成后的回调
        var self = this;

        self.$menu.appendTo( $container )
            .delegate( 'li', 'mouseenter', function() {
                var n = self.$list.index( this );
                if ( self.selected === n ) {
                    return;
                }
                self.select( n, option.disableMouseChangeEvent );
            })
            .delegate( 'li', 'click', function() {
                var n = self.$list.index( this );
                self.selected = n;
                self.done();
            })
            .mouseleave(function() {
                self.select( -1, option.disableMouseChangeEvent );
            });
        if ( option.useFocus ) {
            var $focus = self.$menu.children('a');           // focus用的链接
            $focus.keydown(function( e ) {
                e.preventDefault();
                switch(e.which) {
                    // enter
                    case 13:
                        self.done();
                        break;
                    // esc
                    case 27:
                        self.hide();
                        break;
                    // down
                    case 40:
                        self.down();
                        break;
                    // up
                    case 38:
                        self.up();
                        break;
                }
            }).focus(function() {
                self.show();
                if ( self.selected === -1 ) {
                    self.select(0);
                }
            });
            /**
             * focus Menu组件
             * 然后按上下建可以移动
             */
            this.focus = function() {
                $focus.focus();
                return this;
            };
        }
    };
    Event.extend( Menu );

    /**
     * 上一个
     */
    Menu.prototype.up = function() {
        var num = this.selected-1;
        if ( num < 0 ) {
            num = this.data.length-1;
        }
        this.select( num );
        return this;
    };

    /**
     * 下一个
     */
    Menu.prototype.down = function() {
        var num = this.selected+1;
        if ( num > this.data.length-1 ) {
            num = 0;
        }
        this.select( num );
        return this;
    };

    /**
     * 选择第几个，或者获得选择的选项
     * @param {number} num 选择的次序
     * @param {boolean} disableChangeEvent 取消change事件分发
     * @return {object/string} 返回menu对象，或者选择的data选项，没有选择则返回undefined
     */
    Menu.prototype.select = function( num, disableChangeEvent ) {
        if ( num == null ) {
            return this.data[this.selected];
        }
        if ( num < -1 || num >= this.data.length ) {
            num = -1;
        }
        // 如果有所改变则触发onChange时间
        if ( !disableChangeEvent && this.selected !== num && !this.fire( 'change', this.data[num] ) ) {
            return this;
        }
        this.selected = num;
        this.$list.removeClass('selected');
        if ( this.selected !== -1 ) {
            $( this.$list[this.selected] ).addClass('selected');
        }
        return this;
    };

    /**
     * 删除菜单
     */
    Menu.prototype.remove = function() {
        if ( !this.fire( 'remove' ) ) {
            return;
        }
        if (this.$menu) {
            this.$menu.remove();
        }
        delete this.$menu;
        delete this.$list;
        delete this.selected;
        delete this.data;
        delete this.doneCallBack;
    };

    /**
     * 显示菜单
     */
    Menu.prototype.show = function() {
        this.$menu.show();
        return this;
    };

    /**
     * 隐藏
     */
    Menu.prototype.hide = function() {
        if ( !this.fire( 'hide' ) ) {
            return this;
        }
        this.$menu.hide();
        return this;
    };

    /**
     * 添加选择值修改时候的回调函数，接收参数为选择值，this为menu对象
     * @param {function} callback 
     */
    Menu.prototype.onChange = function( callback ) {
        this.on( 'change', callback, this );
        return this;
    };

    /**
     * 移除menu时候的回调函数，无参数，this为menu对象
     * @param {function} callback 
     */
    Menu.prototype.onRemove = function( callback ) {
        this.on( 'remove', callback, this );
        return this;
    };

    /**
     * 隐藏menu时候的回调函数，无参数，this为menu对象
     * @param {function} callback 
     */
    Menu.prototype.onHide = function( callback ) {
        this.on( 'hide', callback, this );
        return this;
    };

    /**
     * 触发选则完毕事件发生
     */
    Menu.prototype.done = function() {
        if (this.doneCallBack) {
            this.doneCallBack.call( this, this.data[this.selected] );
        }
        return this;
    };

    return Menu;
});
