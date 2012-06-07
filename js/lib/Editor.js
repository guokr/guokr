/**
 * 编辑器模块
 * @author mzhou
 * @desc 用于所见即所得的UBB编辑器
 * @version 1.5
 * @log 1.1 修改添加了配置文件中的contentHtml参数，当有此参数时content的子元素会被contentHtml替换，并选取其子元素中的textarea作为编辑器的包装对象
 *      1.2 使用block2替代block
 *      1.3 重构了编辑器，添加了很多特性，支持了多实例，添加了@功能
 *      1.4 支持了设置div为输入框的功能
 *      1.4 使用Overlay替代block2
 *      1.5 完全重构了代码
 */

/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr    :true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "Overlay.js";
//@import "ajaxfile.js";
//@import "tab.js";
//@import "UBBUtils.js";
//@import "EditorHelper.js";
//@import "rangy-restore.js";
//@import "TextUtils.js";
//@import "at.js";
G.def(
    'Editor',
    ['UBB', 'Event', 'Editor/TextApi', 'Editor/ViewApi', 'cookies'],
    function (UBB, Event, TextApi, ViewApi, cookies) {
        'use strict';
        var idNum = 0,
            cookie = 'editorMod',
            prefix = 'editor'; // 所有相关id的前缀
        function Editor(option) {
            idNum++;
            var _option = {
                    content: '#editorContent',
                    //contentHtml: '<textarea></textarea>', // 如果有则使用其来作为content的内容，它必然包含了textarea
                    //defaultValue: '',         // 如果有则使用其作为textarea默认值
                    height: 300,
                    autoHeight: true,
                    css: '/skin/lib/Editor-iframe.css?v2.6',
                    //actionsSetting: {},
                    //actions: {},
                    //rendPath: true,                              //是否在编辑器下方绘制路径
                    initMod: parseInt(cookies.get(cookie), 10) || 0
                    // 编辑器的初始化模式，优先使用配置代码，其次为cookies中的editorMod值，最后为0
                },
                win,
                doc,
                $text;




            this.textApi = new TextApi($text);
            this.viewApi = new ViewApi(doc);
        }
        Event.extend(Editor.prototype);
        Editor.prototype.update = function() {

        };
        Editor.prototype.showEditor = function() {

        };
        Editor.prototype.showSource = function() {

        };
        Editor.prototype.clear = function() {

        };
        Editor.prototype.val = function() {

        };
        Editor.prototype.focus = function() {

        };
        Editor.prototype.remove = function() {

        };
    }
);