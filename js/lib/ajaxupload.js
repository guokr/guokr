/*
 * 异步文件上传模块，用iframe实现
 * @author: yuest
 * @desc: 文件上传模块
 * @version: 1.0
 * @eg: 参考 form.js 中的使用方式
 */
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */
G.def('ajaxupload', function () {
    'use strict';
    /*
    * 文件异步上传函数，iframe 实现，新添加的 iframe 留在 body 内最后面，因为一些问题不会清除 iframe。
    * @param {string} url 要上传 POST 到的地址
    * @param {jQuery Object} $inputFile 与要上传的文件关联的 <input type="file" ... /> 的 jQuery 对象。
    * @param {Object} settings 设置，包括 data, asyncPapare, success, timeout, timeoutCallback 五个属性。
    * */
    var timeoutTimerMap = {}, //以 url + input[type=file] 为 key 记录的超时 timer
        successCheckMap = {}; //用于保证多次点击上传时只调用最后一次的 success
    return function (url, $inputFile, settings) {
        var mapkey = url + $inputFile[0].name,
            timeouted = false,
            succeeded = false,
            _timer;

        settings = $.extend( {
            //asyncPrepare: function (ready) { var preparedData = {}; ready(preparedData); }, //异步准备函数
            //success: function (data) {}, //成功POST后的回调函数
            timeout: 0, //超时的时间，单位是秒，默认为 0 不设置
            //timeoutCallback: function () {}, //超时后的 callback
            data: {}
        }, settings);

        //超时设置 TODO 目前只在超时后调用 timeoutCallback 且永不调用 success，而没有中断上传 POST
        if ( settings.timeout && settings.timeoutCallback ) {
            _timer = setTimeout(function () {
                if (!succeeded) {
                    timeouted = true;
                    settings.timeoutCallback.call( null );
                }
            }, settings.timeout * 1000 );
            if ( url + $inputFile[0].name in timeoutTimerMap ) {
                clearTimeout( timeoutTimerMap[mapkey] );
            }
            timeoutTimerMap[mapkey] = _timer;
        }

        //上传
        function upload() {
            var randomString = Math.random().toString(36).substring(2),
                iframeId = 'hidden_iframe_' + randomString,
                formId = 'hidden_form_' + randomString,
                $originalParent = $inputFile.parent(),
                $input,
                $iframe = $('<iframe id="' + iframeId + '" name="' + iframeId + '" />') //对于 IE 要在创建的字符串就给出 id 和 name，如果 $('<iframe/>').attr('name', ...)，form 设置 target 到这个 iframe 仍然会提交到新窗口
                          .css('display', 'none')
                          .appendTo('body'),
                $form = $inputFile.wrap('<form/>').parent()
                        .css('display', 'none')
                        .attr({
                            'id': formId,
                            'name': formId,
                            'target': iframeId,
                            'enctype': 'multipart/form-data',
                            'encoding': 'multipart/form-data',
                            'action': url,
                            'method': 'POST'
                        })
                        .appendTo('body');

            successCheckMap[mapkey] = randomString;
            $.each( settings.data, function (i, el) {
                $('<input type="hidden"/>').attr('name', i ).val( el ).appendTo( $form );
            });

            $iframe.bind('load', function () {
                var data = $iframe.contents().text();
                if (successCheckMap[mapkey] == randomString && !timeouted && settings.success && data) {
                    succeeded = true;
                    settings.success.call( null, data );
                }
                //$iframe.remove();//TODO: 这样 remove 会造成网页 favicon 一直在转圈浏览器一直显示正在 loading
            });

            $form.submit();
            $form.find('input:not(:file)').remove();
            $inputFile.unwrap().appendTo( $originalParent );
        };
        function asyncPrepareReady(data) {
            settings.data = $.extend(settings.data, data);
            upload();
        }
        if (settings.asyncPrepare) {
            settings.asyncPrepare.call(null, asyncPrepareReady);
        } else {
            upload();
        }
    };
});
