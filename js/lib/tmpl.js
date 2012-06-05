/**
 * 基于john resig的micro template写的前端模板模块
 * @author mzhou
 * @version 1.0
 * @description 此模块基于自john resig的micro template，最大的特色是代码很少，性能处于中等水准<http://jsperf.com/dom-vs-innerhtml-based-templating/73>
 */
G.def( 'tmpl', function() {
    var cache = {};
    return function tmpl( str, data ) {
        var fn = !/\W/.test(str) ? 
            cache[str] = cache[str] || tmpl(document.getElementById(str).innerHTML) :
            
            new Function("obj",
                "var p=[],print=function(){p.push.apply(p,arguments);};" +
                "with(obj){p.push('" +
                str
                  .replace(/[\r\t\n]/g, " ")
                  .split("<%").join("\t")
                  .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                  .replace(/\t=(.*?)%>/g, "',$1,'")
                  .split("\t").join("');")
                  .split("%>").join("p.push('")
                  .split("\r").join("\\'")
            + "');}return p.join('');");
        return data ? fn( data ) : fn;
    };
});


