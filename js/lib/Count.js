/**
 * 计数器模块
 *  <span id="counter">NB指数213123</span>
 *      var counter = new Count('#counter');
 *      counter.add(1);
 *      counter.add(-1);
 *      counter.set(99999);
 * @author mzhou
 * @desc   用于修改文字中的数字值，一般用于关注数的更新
 * @version 1.1
 * @log     1.0 创建
 *          1.1 添加参数min，max。用于指定范围
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def('Count',function() {
    'use strict';
    var numExp = /([^\-0-9]+)?([\-0-9]+)([\w\W]+)?/;
    
    function add( $count, num, min, max ) {
        var reg = numExp.exec( $count.text() ),
            n;
        n = +reg[2] + num;
        if ( min != null ) {
            n = Math.max( min, n );
        }
        if ( max != null) {
            n = Math.min( max, n );
        }
        $count.text(reg ? ( ( reg[1] || '' ) + n + ( reg[3] || '' ) ) : '');
    }

    function set( $count, num, min, max ) {
        var reg = numExp.exec( $count.text() );
        if ( min != null) {
            num = Math.max( min, num );
        }
        if ( max != null) {
            num = Math.min( max, num );
        }
        $count.text(reg ? ( ( reg[1] || '' ) + num + ( reg[3] || '' ) ) : '');
    }

    /**
     * @param {string/object} countSelector 计数器选择符
     * @param {number} min 最小值，如果设置值比此小就使用此值
     * @param {number} max 最大值，如果设置值比此大就使用此值
     */
    return function( countSelector, min, max ) {
        var $count = $(countSelector); //缓存计数器dom
        this.add = function( num ) {
            add( $count, num, min, max );
            return this;
        };
        this.set = function( num ) {
            set( $count, num, min, max );
            return this;
        };
    };
}); 


