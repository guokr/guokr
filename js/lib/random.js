/**
 * 随机函数库
 * 使用方法：
 *      random([1,3,4])                                  // 随机获取数组中的某一项
 *      random([1,3,4], 3)                               // 随机选取数组中前3个项中某一项
 *      random([1,3,4], function(item) { return item;})  // 以数组的值为权重，随机选取数组中的某一项
 *      random( 0, 10 )                                  // 随机0到10中的一个整数,包括0，但不包括0，即[0,10)
 *      random( 0, 10, true )                            // 随机0到10中的非整数，包括0，但不包括0，即[0,10)
 * @author mzhou
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def('random', function() {
    'use strict';
    var random, randomBetween, until, weight;
    /**
     * 两种功能：
     *      一：计算指定区间之间的随机数
     *      二：得到指定数组的Random对象
     * @param {array/number} list/from
     * @param {number/function} to 
     * @param {boolean} notInteger 是否返回非整数
     * @return {object/number} 
     */
    random = function(list, to, notInteger) {
        if (G.isArray(list)) {
            if (to && G.isFun(to)) {
                return weight(list, to);
            } else {
                return until(list, parseInt(to, 10) || list.length);
            }
        } else {
            return randomBetween(list, parseInt(to, 10), notInteger);
        }
    };
    /**
     * 计算指定区间之间的随机数
     *      区间为[from,to)
     * @param {number} from 开始值
     * @param {number} to 结束值
     * @param {boolean} notInteger 是否返回非整数
     * @return {number} 
     */
    randomBetween = function(from, to, notInteger) {
        return notInteger ? Math.random() * (to - from) + from : Math.floor(Math.random() * (to - from) + from);
    };
    /**
     * 随机选取数组中前3个项中某一项
     * @param {number} end 结束值
     * @return {object}
     */
    until = function(list, end) {
        if (!list.length || !end) {
            return;
        }
        return list[randomBetween(0, end)];
    };
    /**
     * 以数组的值为权重，随机选取数组中的某一项
     * @param {function} getWeight 获取weight的方式，默认为obj的weight属性。 权重值小于等于0则不会被选取到。
     * @return {object} 
     */
    weight = function(list, getWeight) {
        if (!list || !list.length) {
            return;
        }
        var sum = 0,
            i = 0,
            l = list.length,
            ran, cur = 0,
            w;
        for (; i < l; i++) {
            w = getWeight(list[i]);
            if (w <= 0) {
                continue;
            }
            sum += w;
        }
        ran = randomBetween(1, sum + 1); // 取[1, sum+1)
        for (i = 0; i < l; i++) {
            w = getWeight(list[i]);
            if (w <= 0) {
                continue;
            }
            cur += w;
            if (cur >= ran) {
                return list[i];
            }
        }
    };
    return random;
});
