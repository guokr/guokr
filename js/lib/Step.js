/**
 * 步骤控制模块
 *      每一步骤只能运行一次
 *      如果有运行条件，则必须满足才能运行
 *      步骤之间是双向链表关系
 *      不一定从开始步骤运行，直接从中间开始也可
 *      是否执行下一步由回调函数决定，若没有完成回调函数，则一定执行下一步。如果已完成，则不会运行下一步，直接返回
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'Step', function() {
    'use strict';
    /**
     * 每一步
     * @param {function} method 方法，参数：数据data，完成后执行函数complete
     * @param {object} data 方法执行所需数据
     * @param {function} completeCallback 【可选】完成此步后的回调函数，参数为执行下一步的函数
     * @param {function} condition 【可选】执行此步骤的运行先决条件
     */
    function Step( method, data, completeCallback, condition ) {
        this.method = method;
        this.data = data;
        this.completeCallback = completeCallback;
        this.condition = condition;
    }
    Step.prototype = {
        index: 0,
        //prev: null,
        //next: null,
        /**
         * 从最开始的步骤运行，如果之前都已运行完毕则运行自己
         */
        runFromStart: function() {
            var _this = this;
            if ( _this.prev != null && !_this.prev.complete ) {
                _this.prev.run();
                return;
            }
            _this.run();
            return _this;
        },
        /**
         * 运行
         *      是否调用下一步由回调函数决定，若没有完成回调函数，则一定执行下一步
         *      如果已完成，则不会运行下一步，直接返回
         */
        run: function() {
            var _this = this;
            if ( _this.complete ) {
                return _this;
            }
            if ( _this.condition && !_this.condition() ) {
                return _this;
            }
            // 完成后执行回调函数
            function complete() {
                _this.complete = true;
                if ( _this.completeCallback ) {
                    _this.completeCallback(function() {
                        if (_this.next) {
                            _this.next.run();
                        }
                    });
                } else {
                    if (_this.next) {
                        _this.next.run();
                    }
                }
            }
            _this.method( _this.data, complete );
            return _this;
        },
        /**
         * 将指定步骤链接到当前步骤之后
         * @param {object} step 要插入的步骤
         */
        link: function( step ) {
            if ( this.next ) {
                this.next.link( step );
            } else {
                this.next = step;
                step.prev = this;
                step.index = this.index+1;
            }
            return this;
        }
    };

    return Step;
});
