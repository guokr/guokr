/**
 * placeholder模块
 * 用于模拟html5 form的placeholder元素，用特征检测的方式获取浏览器的支持性，如果不支持就用js实现。默认的placeholder字体颜色是#CCC
 *          1.1 添加了submit方法，用于处理表单为空或者为placeholder值的时候不让提交的方法
 * @author: mzhou
 * @version: 1.1
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'placeholder', function() {
    'use strict';
    var support = document.createElement('textarea').placeholder === '';
    
    /**
     * 设置input的holder值
     * @param: input        输入框的jquery对象
     * @param: holder       placeholder值
     */
    function setVal( input, holder ) {
        if ( input.val() === '' ) {
            input.val( holder ).css( 'color', '#CCC');
        }
    }
    
    return {
        /**
         * 设置input:text的placeholder，做降级处理
         * @param {string/dom/object} selector input:text的jquery对象
         * @return {object} 返回此对象本身
         */
        init:function( selector ) {
            if ( !support ) {
                var $this = $(selector),
                    holder = $this.attr( 'placeholder' ),
                    color = $this.css( 'color' );
                setVal( $this, holder );
                $this.focus(function() {
                    if ( $this.val() === holder ) {
                        $this.val( '' ).css( 'color', color);
                    }
                }).blur(function() {
                    setVal( $this, holder );
                });
            }
            return this;
        },
        /**
         * 设置input:form的submit处理placeholder（即如果value为placeholder，那么value为空），做降级处理
         * @param {string/dom/object} inputTxt input:text的jquery对象
         * @param {string/dom/object} form 表单的jquery对象
         * @param {function} func submit的回调函数
         * @return {object} 返回此对象本身
         */
        submit: function( inputTxt, form, func ) {
            var $txt  = $(inputTxt),
                $form = $(form);
            if ( !support ) {
                $form.submit( function() {
                    var placeholderValue = $txt.attr('placeholder'),
                        v = $txt.val();
                    if ( v === placeholderValue ) {
                        $txt.val('');
                    }
                    return func.apply( this, arguments );
                } );
            } else {
                $form.submit( func );
            }
            return this;
        },
        support:support
    }
});
