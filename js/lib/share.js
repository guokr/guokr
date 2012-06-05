/**
 * 分享模块
 * @author mzhou
 * @desc 用于设置文章内容页的三个分享按钮（以后会重写）。等到全部静态化了就把g.js中的类似代码去了
 * @version 1.0
 *          1.1 修改了当shareData是false时，不会分享文案。即当shareData是函数，且返回false的时候不会分享
 *          1.2 添加了widnow.open参数，避免某些分享页面自动缩放窗口大小影响其他页面，并强制设置了高宽
 *          1.3 将bshare的重定向api为bsahre的js api
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false, bShare:false */

G.def('share', function() {
    'use strict';
    var html = '分享到:\
                    <a data-type="sinaminiblog" class="gui-share-xl" href="#" title="分享到新浪微博">新浪微博</a>\
                    <a data-type="renren" class="gui-share-rr" href="#" title="分享到人人">人人</a>\
                    <a data-type="douban" class="gui-share-db" href="#" title="分享到豆瓣">豆瓣</a>\
                    <a data-type="qzone" class="gui-share-qq" href="#" title="分享到QQ空间">QQ空间</a>\
                    <a data-type="qqmb" class="gui-share-tqq" href="#" title="分享到腾讯微博">腾讯微博</a>',
        defaultUUID = '9dd5aa8d-bbe1-4a9e-ac82-6e6002ca17fa',
        // 目前用bshare提供的服务，如果要修改uuid就改此url
        shareUrl = 'http://static.bshare.cn/b/buttonLite.js',
        //'http://api.bshare.cn/share/{type}?url={url}&title={title}&summary={summary}&publisherUuid={uuid}&pic={pic}',
        inited = 0,
        callbacks, $container;

    /**
     * 初始化加载bshare的js，然后执行callback
     * @param {string} uuid
     * @param {function} callback
     */
    function init(uuid, callback) {
        // 已经加载完成
        if (inited === 2) {
            callback();
            // 正在加载
        } else if (inited === 1) {
            callbacks.push(callback);
            // 未加载
        } else {
            callbacks = callbacks || [];
            callbacks.push(callback);
            inited = 1;
            // 不得不用此bshare的配置
            window.bShareOpt = {
                style: -1,
                pop: -1,
                uuid: uuid,
                lang: 'zh',
                pophcol: 2,
                mdiv: -1
            };
            G.loadScript(shareUrl, function() {
                inited = 2;
                for (var i = 0, l = callbacks.length; i < l; i++) {
                    if (callbacks[i]) {
                        callbacks[i]();
                    }
                }
            });
        }
    }

    /**
     * 设置分享
     * @param {string} container 分享按钮的容器
     * @param {object/function} _shareData 分享的数据，json，例如：
     *                                      { url:'http://www.guokr.com', title:'ss', summary:'summmmmmmary', pic:'http://www.guokr.com/url/' }
     *                                      或者是获取数据的函数（data-type为参数）
     * @param {string} uuid 可选的uuid值，如果不设置则默认使用果壳网bshare的uuid。(果壳问答有单独的bshare uuid：
     *                                      b4a300e8-33b9-4c10-ab7a-8334d4e0987b)
     * @param _html 显示的html
     */
    return function(container, _shareData, uuid, _html) {
        init(uuid || '9dd5aa8d-bbe1-4a9e-ac82-6e6002ca17fa', function() {
            $container = $(container);
            $container.html(_html || html);
            $container.delegate('a', 'click', function(e) {
                e.preventDefault();
                var $this = $(this),
                    type = $this.data('type'),
                    shareData = G.isFun(_shareData) ? _shareData(type) //执行函数，获取分享数据
                    :
                    _shareData,
                    data = shareData;
                if (data === false) {
                    return;
                }
                // 编码
                if (bShare) {
                    bShare.entries = [];
                    bShare.addEntry(shareData);
                    bShare.share(e, type);
                } else {
                    G.log('bshare not loaded');
                }
            });
        });
    };
});
