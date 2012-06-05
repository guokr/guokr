/**
 * 这是一个处理搜索字符串的库，比如用于获取url里面search部分的参数，或者获取hash部分的参数。只要是以key=value&key2=value2为格式的都可以搞定
 * 参考: http://unixpapa.com/js/querystring.html
 * @author mzhou
 * @version 0.1
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'QueryString', function() {
    'use strict';
    /**
     * 初始化
     * @param {string} string 字符串
     */
    var Query = function( string ) {
        this.dict= {};

        // Parse it
        var re = /([^=&]+)(=([^&]*))?/g,
            match;
        while (match = re.exec(string)) {
            var key = decodeURIComponent(match[1].replace(/\+/g,' ')),
                value;
            try {
                // decodeURIComponent解析失败时会报错
                value = match[3] ? decodeURIComponent(match[3]) : '';
            } catch(e) {
                value = '';
            }
            if (this.dict[key]) {
                if ( G.isArray(this.dict) ) {
                    this.dict[key].push(value);
                } else {
                    this.dict[key] = [this.dict[key], value];
                }
            } else {
                this.dict[key] = value;
            }
        }
    };

    /**
     * 将字符串转换成json对象
     * @eg: type=1&type=2&key=v&null
     *      ==> {type:[1,2],key:'v',null:''}
     */
    Query.prototype.toJSON = function() {
        return this.dict;
    };

    /**
     * 以数组形式返回所有的key
     */
    Query.prototype.keys= function () {
        var a = [];
        for (var key in this.dict) {
            a.push(key);
        }
        return a;
    };

    /**
     * 获取某个key值，值为''时返回undefined
     *  ''        ==> undefined
     *  undefined ==> undefined
     *  null      ==> null
     *  0         ==> 0
     * 如果没有设置值，则统一返回undefined
     */
    Query.prototype.get = function( key ) {
        var a = this.dict[key];
        return a === '' ? undefined : a;
    };

    /**
     * json转字符串,值为null或undefined或''的时候会不会被转换
     * @param {object} json json对象
     * @return {string} 字符串
     */
    Query.toQueryString = function( json ) {
        var q = '',
            v;
        for( var k in json ) {
            v = json[k];
            if ( G.isArray(v) ) {
                for(var i=0,l=v.length; i<l; i++) {
                    if ( v[i] != null && v[i] !== '' ) {
                        q += k+'=';
                        q += encodeURIComponent(v[i].toString())+'&';
                    }
                }
            } else if ( v != null && v !== '' ) {
                q += k+'=';
                q += encodeURIComponent(v.toString())+'&';
            }
        }
        return q.slice(0, q.length-1);
    };

    /**
     * 获取url里面search部分的Query对象
     * @return {object} Query对象
     */
    Query.getSearch = function() {
        return new Query( location.search.slice(1) );
    };

    /**
     * 获取url里面hash部分的Query对象
     * @return {object} Query对象
     */
    Query.getHash = function() {
        return new Query( location.hash.slice(1) );
    };

    return Query;
});
