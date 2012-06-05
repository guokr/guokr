/**
 * 用于验证字符串的组件
 * @author mzhou
 * @log 0.1
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def( 'ValidateUtils', function() {
    'use strict';
    var emailReg = /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/,
        urlReg = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@\?\^=%&:\/~\+#]*[\w\-@?\^=%&\/~\+#])?/;

    return {
        isEnglishAndNumber  : function( text ) {
            return (/[^\x00-\xff]/ig).test( text );
        },
        isNickname : function( s ){
            return !s.match(/[^\u3400-\u4db5\u4e00-\u9fcbA-Za-z0-9._\-]/);
        },
        isNicknameLen: function( s ) {
            var c   = s.match(/[^\x00-\xff]/ig),
                len = s.length + (c == null ? 0 : c.length);
            return len <= 20;
        },
        isEmail : function( text ){
            return emailReg.test( text );
        },
        isUrl : function( text ){
            return urlReg.test( text );
        },
        hasAngleBrackets : function( text ){
            return text.indexOf( '>' ) === -1 && text.indexOf( '<' ) === -1;
        },
        isVcode : function( text ){
            return (/^[0-9a-zA-Z]{4}$/).test( text );
        }
    }
});
