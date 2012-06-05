/**
 * cookies module
 *    1.1 修改了set函数的返回
 * @author: mzhou
 * @version: 1.1
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false, unescape:false, escape:false */

G.def('cookies', {
    /**
     * 获取cookies中key为name的值
     * @param {string} name key值
     * @return {string} 返回对应值，如果没有则返回''
     */
    get: function(name) {
        'use strict';
        if (document.cookie.length > 0) {
            var e, s = document.cookie.indexOf(name + '=');
            if (s != -1) {
                s = s + name.length + 1;
                e = document.cookie.indexOf(';', s);
                if (e == -1) {
                    e = document.cookie.length;
                }
                return unescape(document.cookie.substring(s, e));
            }
        }
        return '';
    },
    /**
     * 设置cookies的值
     * @param {string} name key值
     * @param {string} val 值
     * @param {object} expired 过期时间的date对象
     * @param {string} path 路径对象
     * @param {object} 对象本身
     */
    set: function(name, val, expired, path) {
        'use strict';
        document.cookie = name + '=' + escape(val) + ((expired == null) ? '' : ';expires=' + expired.toGMTString()) + ';path=' + (path || '/');
        return this;
    },
    /**
     * 删除cookies
     * @param {string} name 
     */
    remove: function(name) {
        'use strict';
        var exp = new Date();
        exp.setTime(exp.getTime() - 1); // 设置过期时间
        var val = this.get(name);
        if (val != null) {
            document.cookie = name + "=" + val + ";expires=" + exp.toGMTString();
        }
    }
});
