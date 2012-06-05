/**
 * form表单验证插件
 *      支持多表单验证
 *      支持自定义验证规则和提示信息
 * @author mzhou
 * @version 1.0
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false, g_obj_id:true */
G.def( 'validate', ['ValidateUtils'], function( ValidateUtils ) {
    'use strict';

    /**
     * ［工具函数］返回每个规则对应的jquery对象
     * @private
     * @param {object} rule 单规则对象
     * @returns {Object} 对应于此规则的jquery对象
     */
    function getInputs( rule ) {
        if ( rule._isLive ) {
            return $( rule._selector );
        } else {
            if ( !rule._$inputs ) {
                rule._$inputs = $( rule._selector );
            }
            return rule._$inputs;
        }
    }

    /**
     * ［工具函数］调用html5的规则
     * @private
     * @param {object} source 触发事件的源对象dom
     * @param {string} methodName 规则名
     * @returns {boolean} 成功与否
    function callHtml5Rule( source, methodName ) {
        var valide;
        if ( !source ) {
            throw 'input not exist, rule is broken!';
        }
        if (    ( source[ methodName ] || source.getAttribute( 'type' ) === methodName )
             && ( html5PropSupport[ methodName ] || html5TypeSupport[ methodName ] )
             && source.checkValidity 
             && source.validity ) {
            source.checkValidity();
            valide = !source.validity[ html5Map[ methodName ] ];
        }
        if ( methodName === 'email' ) 
            console.log( valide );
        return valide;
    }
     */

    /**
     * ［工具函数］调用规则的验证方法们
     * @private
     * @param {dom} source 验证事件触发的源元素
     * @param {object} $inputs 对应规则的inputs jquery对象
     * @param {object} rule 单个规则对象
     * @param {object} methods 所有的函数
     * @param {function} trigger 信息提示的触发函数
     */
    function callRules( source, $inputs, rule, methods, trigger ) {
        var success = true;                    // 最终验证成功与否

        for ( var prop in rule ) {
            if ( prop.slice( 0, 1 ) === '_' ) {
                continue;
            }
            var result,                     // 事件触发结果
                arg    = rule[ prop ],      // 参数
                desc   = rule._desc,        // 规则描述，比如：“邮箱”
                method = methods[ prop ];   // 验证方法
                //valide = callHtml5Rule( source || $inputs[0], prop );
            // 浏览器验证ok，则继续下一个验证
            /*if ( valide === true ) {*/
                //continue;
            //// 浏览器验证失败，则结束验证
            //} else if ( valide === false ) {
                //trigger( false, $inputs, prop, rule );
                //rule._isValidated = false;
                //return;
            /*}*/

            // 如果浏览器不支持此验证则使用js验证
            if ( !method ) {
                continue;
            }
            result = method.call( $inputs, arg, rule, source );
            switch( result ) {
                case true: // sync validate success
                    break;
                case false: // sync validate failed
                    trigger( false, $inputs, prop, rule );
                    rule._isValidated = false;
                    return;
                default: // async
                    rule._asyncValidateError = 0; // 状态置空，确保只要他尝试修改过，那么之前异步验证即使错误也可以直接提交
                    success = false;
                    break;
            }
        }
        rule._isValidated = true;
        trigger( success || null, $inputs, prop, rule );
    }

    /**
     * ［工具函数］找到与指定元素对应的规则并返回，如果是live规则，则会在获取之后设置_$inputs
     * @private
     * @param {dom} input 指定的元素
     * @param {object} rules 所有的验证规则
     * @returns 单个规则
     */
    function filterRule( input, rules ) {
        for ( var ruleName in rules ) {
            var rule = rules[ ruleName ],
                $inputs = getInputs( rule );
            
            if ( $inputs.filter( input ).length !== 0 ) {
                if ( rule._isLive ) {
                    rule._$inputs = $inputs;
                }
                return rule;
            }
        }
    }

    /**
     * ［工具函数］绑定form的相关事件
     * @private
     * @param {object} $form 表单的
     * @param {object} option 初始化参数
     * @param {object} rules 所有验证方法
     * @param {object} methods 验证方法
     * @param {object} trigger 信息显示的调用方法
     */
    function bindValidate( $form, option, rules, methods, trigger ) {
        function validate( e ) {
            var self = e.target,
                rule = filterRule( self, rules );
            // 此元素没有验证
            if ( !rule ) {
                return;
            }
            if ( option.beforeValidate && !option.beforeValidate.call( null, self ) ) {
                return;
            }
            callRules(
                self,
                rule._$inputs,
                rule,
                methods,
                trigger
            );
            if ( option.afterValidate ) {
                option.afterValidate.call( null, self );
            }
        }
        // 表单元素的验证事件
        $form.focusout( validate )
        // 表单元素的focus事件绑定
        .delegate( 'input', 'focus', function( e ) {
            var self = this,
                rule = filterRule( self, rules );
            // 此元素没有验证
            if ( !rule ) {
                return;
            }
            rule._isValidated = false;
        })
        // 确保enter的时候触发blur事件
        .delegate( 'input', 'keydown', function( e ) {
            if ( e.keyCode === 13 ) {
                validate( e );
            }
        })
        // 确保 chrome 中 checkbox 改变时触发验证 这是由于 focus 事件激活顺序导致的
        // radio 也会有这个问题
        .delegate( 'input:checkbox', 'change', function( e ) {
            validate( e );
        })
        // 表单的submit事件验证
        .submit(function( e ) {
            var self = this;
            if ( self.sign === true ) {
                e.preventDefault();
                return false;
            }
            self.sign = true;
            if ( option.beforeFormValidate && !option.beforeFormValidate.call( null, self ) ) {
                e.preventDefault();
                self.sign = false;
                return false;
            }
            var ruleName,
                rule,
                success = true;
            for ( ruleName in rules ) {
                rule = rules[ ruleName ];
                // 同步验证已经成功则跳过
                if ( rule._isValidated && rule._asyncValidateError === 0 ) {
                    continue;
                }
                // 同步或异步验证已经失败了，则不提交表单并跳过验证
                if ( rule._isValidated === false || rule._asyncValidateError !== 0 ) {
                    success = false;
                    continue;
                }
                // 如果还没验证过就验证下
                callRules(
                    null,
                    getInputs( rule ),
                    rule,
                    methods,
                    trigger
                );
                // 同步验证失败则不提交表单
                if ( rule._isValidated === false ) {
                    success = false;
                }
            }
            if ( success === false ) {
                e.preventDefault();
                self.sign = false;
                return false;
            }
            if ( option.afterFormValidate && !option.afterFormValidate.call( null, self ) ) {
                e.preventDefault();
                self.sign = false;
                return false;
            }
            option.showAsyncMsg = false;
            self.sign = false;
        });
    }

    /**
     * ［工具函数］设置在原函数之后执行另一个函数，如果原函数返回false，则不执行
     * @param {function} after 另一个函数
     * @param {function} fun 原函数，可以为空
     * @returns {function} 新的组合函数
     */
    function afterFunc( after, func ) {
        return function() {
            if ( func ) {
                if ( !func.apply( null, arguments ) ) {
                    return false;
                }
            }
            return after.apply( null, arguments );
        }
    }

    /**
     * ［工具函数］设置在原函数之前执行另一个函数，如果另一个函数返回false，则不执行原函数
     * @param {function} after 另一个函数
     * @param {function} fun 原函数，可以为空
     * @returns {function} 新的组合函数
     */
    function beforeFunc( before, func ){
        return function() {
            if ( !before.apply( this, arguments ) ) {
                return false;
            }
            if ( func ) {
                return func.apply( this, arguments );
            } else {
                return true;
            }
        }
    }

    /**
     * 初始化验证表单
     *      _option = {
     *          showAsyncMsg: true,                // 是否在提交表单成功之后，但是页面没有跳转之前，显示异步验证的结果
     *          msgClass : {
     *              error   : 'error',             // 错误的错误信息样式
     *              success : 'success'            // 正确的错误信息样式
     *          },
     *          msgPlace : function( element ) {
     *              // input element
     *              // return error element
     *              return $( element ).next();
     *         },
     *         // 在单个规则开始验证之前调用，如果返回false则不在使用规则验证，主要用于处理触发验证事件的dom元素值的预处理
     *         beforeValidate: function( dom ) { 
     *             G.log( 'before validate!' );
     *             G.log( dom ); // input dom element
     *             return true; 
     *         },
     *         // 在单个规则结束的时候调用，同样用于处理处理验证事件的值
     *         afterValidate: function( dom ) { 
     *             G.log( 'after validate!' );
     *             G.log( dom );
     *         },
     *         // 在整个表单验证之前，做预处理，如果返回false则不在验证
     *         beforeFormValidate: function( form ) {
     *             G.log( 'before validate!' );
     *             G.log( form );
     *             return true;
     *         },
     *         // 在整个表单验证成功之后，做提交表单的预处理，也可以返回false，阻止表单提交
     *         afterFormValidate: function( form ) {
     *             G.log( 'after submit!' );
     *             G.log( form );
     *             return fasle;
     *         },
     *         // 验证成功的回调函数，用于处理验证成功时候的显示。如果有此信息则不调用默认方法
     *         successCallBack: function( msgPlace, msg, arg, desc ) {
     *             // show success;
     *         },
     *         // 验证失败的回调函数，用于处理验证失败时候的显示。如果有此信息则不调用默认方法
     *         errorCallBack: function( msgPlace, msg, arg, desc ) {
     *             // show error;
     *         }
     *      },
     *      _rules = {
     *          id: {
     *              _selector           : '.class',        // 如果没有 selector 则会在调用rules方法或初始化的时候添加为“#id”
     *              _desc               : 'id',            // 用于描述此input，会在显示错误信息时候被调用
     *              _isValidated        : null,            // 默认是否通过验证，此值会在input值修改的时候被设置为false，验证成功后修改为true,验证失败修改为false，如果有异步验证则验证调用之后并不设置其值。默认为null
     *              _asyncValidateError : 0,               // 表示此规则异步验证调用出错与否，正确为0，错误为1;目前只支持一个异步调用
     *              _$inputs            : $( _selector )   // 不需要用户添加。如果是live的，那么就不一定有此属性。
     *              _isLive             : false,           // 用于表示，用_selector或者是id获取_doms时是否是像jquery live方法那样支持后来添加的元素。默认为false
     *              method              : arg,             // 验证方法1, 及其参数
     *              method2             : arg,             // 验证方法2
     *
     *          }
     *      }
     * @public
     * @param {string} _formSelector 验证表单选择符号
     * @param {object} _rules 验证规则
     * @param {object} _option 配置
     */
    return function validator( _formSelector, _rules, _option) {
        var exports = {},
            option  = {
                showAsyncMsg: true,
                msgClass : {
                    error   : 'error',             // 错误的错误信息样式
                    success : 'success'            // 正确的错误信息样式
                },
                /**
                 * 获取信息提示元素
                 * @private
                 * @param {dom} element 触发验证的jquery元素
                 * @return {object} 信息提示处的jquery对象
                 */
                msgPlace : function( $element ) {
                    return $element.next();
                }
            },
            eqCache = {},
            methods = {
                /**
                 * ======================================================
                 * method : function( arg, rule, souce ) {
                 *      souce === source element;
                 *      this === jquery object of input elements for this rule
                 *      return true/false;
                 * }
                 * ======================================================
                 */
                pattern  : function( pattern, rule, source ) {
                    return new RegExp( pattern ).test( this.val() );
                },
                required : function( arg, rule, source ) {
                    return  !arg || !!this.val();
                },
                email    : function( arg, rule, source ) {
                    return ValidateUtils.isEmail( this.val() );
                },
                url      : function( arg, rule, source ) {
                    return ValidateUtils.isUrl( this.val() );
                },
                eq       : function eq( id, rule, source ) {
                    var self = this;
                    if ( !eqCache[ id ] ) {
                        eqCache[ id ] = true;
                        exports.afterValidate(function( dom ) {
                            if ( $(dom).is( '#'+id ) ) {
                                exports.validate( source, self, rule );
                            }
                        });
                    }
                    return self.val() === $( '#'+id ).val();
                },
                min      : function( n ) {
                    return parseInt( this.val(), 10 ) <= n;
                },
                max      : function( n ) {
                    return parseInt( this.val(), 10 ) >= n;
                },
                minlength: function( len, rule, source ) {
                    return this.val().length >= len;
                },
                maxlength: function( len, rule, source ) {
                    return this.val().length <= len;
                },
                nickname : function() {
                    return ValidateUtils.isNickname( this.val() );
                },
                nicknameLen: function() {
                    return ValidateUtils.isNicknameLen( this.val() );
                },
                async: function( arg, rule, source ) {
                    var param = {},
                        self  = this;
                    param[ arg.param ] = this.val();
                    $.ajax({
                        type: 'POST',
                        url: arg.url,
                        data: param,
                        dataType: 'json',
                        success: function( data ) {
                            exports.asyncTrigger( data, self, 'async', rule, arg.msg );
                        },
                        error: function() {
                            if ( arg.error ) {
                                arg.error.call();
                            }
                        }
                    });
                    // not return,so tigger by this function exports;
                }
            },
            msgs  = {
                pattern  : '{desc}格式不正确',
                required : '{desc}是必填的',
                email    : '{desc}格式不正确',
                url      : '{desc}格式不正确',
                eq       : '两次输入的{desc}不一致',
                min      : '{desc}必需大于{arg}',
                max      : '{desc}必需小于{arg}',
                minlength: '{desc}太短，至少{arg}个字',
                maxlength: '太长了，不能超过{arg}个字',
                nickname : '仅限中英文、数字、“.”、“-”及“_”',
                nicknameLen : '太长，最多10个汉字或者20个英文、数字'
            },
            $form = $( _formSelector ),
            rules = {};
        
        /**
         * 触发验证元素
         * @param {dom} source 要验证的元素
         * @param {object} $inputs 要验证的元素组,jquery对象
         * @param {object} rule 此元素的验证规则
         * @returns {object} 对象本身
         */
        exports.validate = function( source, $inputs, rule ) {
            callRules( source, $inputs, rule, methods, exports.trigger );
            return this;
        };

        /**
         * 获取信息提示区域
         * @public
         * @param {dom} element 变量
         * @param {object} rule 验证规则
         * @returns {object} 返回msgPlace获取的jQuery对象
         */
        exports.getMsgPlace = function( element, rule ) {
            var msg = rule._msgPlace;
            if ( !msg ) {
                msg = rule._msgPlace = option.msgPlace( element );
            }
            return msg;
        };

        /**
         * 触发显示对单个input验证的结果
         * @public
         * @param {boolean} isSuccess 验证成功与否, 如果为null则表示是有异步验证
         * @param {string} methodName 规则名
         * @param {object} rule 规则
         * @param {string} msg如果之前没有定义过消息，则使用此消息
         * @param {boolean} isAsync 表示是否是异步调用的结果
         * @returns {object} 对象本身
         */
        exports.trigger = function( isSuccess, $inputs, methodName, rule, msg, isAsync ) {
            var msgPlace = exports.getMsgPlace( $inputs, rule ),
                msgClass = option.msgClass,
                arg      = rule[ methodName ],
                desc     = rule._desc;
            msg = msgs[ methodName ] || msg;

            // 如果是null则表示有异步验证，这是清理掉之前的验证结果，因为我们不确定正确与否
            if ( isSuccess == null ) {
                if ( option.clearCallBack ) {
                    option.clearCallBack.call( null, msgPlace, msg, arg, desc );
                } else {
                    msgPlace.removeClass( msgClass.error )
                            .removeClass( msgClass.success )
                            .text('');
                }
            // 验证成功
            } else if ( isSuccess === true ) {
                if ( option.successCallBack ) {
                    option.successCallBack.call( null, msgPlace, msg, arg, desc );
                } else {
                    msgPlace.removeClass( msgClass.error )
                            .addClass( msgClass.success )
                            .html('&nbsp;');// 设置一个空格，避免IE6/7显示不了背景bug, 改成&nbsp; 避免影响行高
                }
                // 记录异步验证结果
                if ( isAsync ) {
                    rule._asyncValidateError = 0;
                }
            // 验证失败
            } else if ( isSuccess === false ) {
                if ( option.errorCallBack ) {
                    option.errorCallBack.call( null, msgPlace, msg, arg, desc );
                } else {
                    msgPlace.removeClass( msgClass.success )
                            .addClass( msgClass.error )
                            .text(
                                msg.replace( '{desc}', desc )
                                   .replace( '{arg}', arg )        // TODO 以后待扩展
                            );
                }
                // 记录异步验证结果
                if ( isAsync ) {
                    rule._asyncValidateError = 1;
                }
            }
            return this;
        };

        /**
         * 触发显示对单个input验证的结果,错误情况.如果其他非异步规则已经验证成功，则显示错误信息，否则不显示。
         * @public
         * @param {boolean} isSuccess 验证成功与否, 如果为null则表示是有异步验证
         * @param {object} $inputs 对应规则的元素组
         * @param {string} methodName 验证规则名
         * @param {object} rule 规则
         * @param {string} msg 如果之前没有定义过消息，则使用此消息
         * @returns {object} 对象本身
         */
        exports.asyncTrigger = function( isSuccess, $inputs, methodName, rule, msg ) {
            if ( rule._isValidated && option.showAsyncMsg ) {
                exports.trigger( isSuccess, $inputs, methodName, rule, msg, true );
            }
            return this;
        };

        /**
         * 添加验证方法
         * @public
         * @param {string} name
         * @param {function} func
         * @param {string} msg
         * @returns {object} 对象本身
         */
        exports.method = function( name, func, msg ) {
            methods[ name ] = func;
            msgs[ name ]    = msg;
            return this;
        };

        /**
         * 添加新的验证规则
         * @public
         * @parm {object} _rules 验证规则
         * @returns {object} 对象本身
         */
        exports.rules = function( _rules ) {
            if ( !_rules ) {
                return;
            }
            var rule,
                ruleName;
            for ( ruleName in _rules ) {
                rule = _rules[ ruleName ];
                rule._isValidated = null;
                rule._asyncValidateError = 0;
                if ( !rule._selector ) {
                    rule._selector = '#' + ruleName ;
                }
            }
            //html5Rules( _rules );
            $.extend( rules, _rules );
            return this;
        };

        /**
         * 设置option.afterFormValidate的快捷方法,不会覆盖原来的设置，只是追加
         * @public
         * @param {function} func 添加的方法
         * @returns {object} 对象本身
         */
        exports.afterFormValidate = function( func ) {
            var old = option.afterFormValidate;
            option.afterFormValidate = afterFunc( func, old );
            return this;
        };

        /**
         * 设置option.beforeFormValidate的快捷方法,不会覆盖原来的设置，只是追加
         * @public
         * @param {function} func 添加的方法
         * @returns {object} 对象本身
         */
        exports.beforeFormValidate = function( func ) {
            var old = option.beforeFormValidate;
            option.beforeFormValidate = beforeFunc( func, old );
            return this;
        };

        /**
         * 设置option.beforeValidate的快捷方法,不会覆盖原来的设置，只是追加
         * @public
         * @param {function} func 添加的方法
         * @returns {object} 对象本身
         */
        exports.beforeValidate = function( func ){
            var old = option.beforeValidate;
            option.beforeValidate = beforeFunc( func, old );
            return this;
        };

        /**
         * 设置option.afterValidate的快捷方法,不会覆盖原来的设置，只是追加
         * @public
         * @param {function} func 添加的方法
         * @returns {object} 对象本身
         */
        exports.afterValidate = function( func ) {
            var old = option.afterValidate;
            option.afterValidate = function() {
                if ( old ) {
                    old.apply( this, arguments );
                }
                func.apply( this, arguments );
            }
            return this;
        };

        // init
        $form.attr( 'novalidate', true ); // 不使用原生验证
        $.extend( option, _option );
        exports.rules( _rules );
        bindValidate( $form, option, rules, methods, exports.trigger );
        return exports;
    };
});


