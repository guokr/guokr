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
G.def('Editor', ['UBB', 'Event', 'Editor/TextApi', 'Editor/ViewApi', 'cookies'], function(UBB, Event, TextApi, ViewApi, cookies) {
    'use strict';
    var idNum = 0,
        supportView = (function() {
            return !G.ua.isIE;
        });

    function Editor(option) {
        idNum++;
        var self = this,
            _uploaderOption = {},
            // 上传相关的设置 例如：{ukey:'xsadas',upType:'daily',dataType:'json',url:''}
            _plugins = {
                bold: true,
                italic: true,
                link: true,
                image: true,
                video: true,
                at: true,
                ref: true,
                ul: true,
                ol: true
            },
            actionToggleClass = self.prefix + 'Toggle',
            // 编辑器切换链接的class
            viewId = self.prefix + 'Div' + idNum,
            // $body的id
            borderId = self.prefix + 'Gap' + idNum,
            // border的id
            borderGapTxt = '<div id="{v}" class="gui-ubb-gap"></div>',
            // editor-border
            borderTxt = '<div class="gui-ubb-b"></div>',
            $borderGap, // 编辑器的边框
            iframeTxt = '<iframe id="{v}" class="hide gui-ubb-editor" frameborder="0"></iframe>',
            // iframe的html模板
            htmlTxt = '<html><head><link href="{v}" rel="stylesheet" type="text/css"></head><body><br/></body></html>',
            // action的html模板
            actionPanelTxt = '<div class="gui-ubb-links"></div>',
            // action面板的模板     
            actionPanelToggle = '<div class="{v} gui-ubb-toggle"><a href="javascript:void 0;" data-toggle="code">代码模式</a>&nbsp;|&nbsp;<a href="javascript:void 0;" data-toggle="view">可视化模式</a></div>',
            win, doc, iframe, $body, $text, $actionPanel, $actionToggle, plugins = [];

        self.option = {
            content: '#editorContent',
            //contentHtml: '<textarea></textarea>', // 如果有则使用其来作为content的内容，它必然包含了textarea
            //defaultValue: '',         // 如果有则使用其作为textarea默认值
            height: 300,
            autoHeight: true,
            css: '/skin/lib/Editor-iframe.css?v2.6',
            //actionsSetting: {},
            //actions: {},
            //rendPath: true,                              //是否在编辑器下方绘制路径
            initMod: 0
            // 编辑器的初始化模式，优先使用配置代码，其次为cookies中的editorMod值，最后为0
        };

        // setup option
        $.extend(_plugins, option.plugins);
        delete option.plugins;
        $.extend(self.option, option);
        self.option.uploadOption = $.extend(_uploaderOption, option.uploaderOption);

        // setup $text
        // 如果设置了contentHtml，就以此为textarea
        self.recovery = {};
        $text = $(self.option.content);
        if (self.option.contentHtml) {
            self.recovery.oldText = $text.html();
            $text.html(option.contentHtml);
            $text = $('textarea', $text);
            if (self.option.defaultValue != null) {
                $text.val(self.option.defaultValue || '\n');
            } else {
                $text.val(self.recovery.oldText);
            }
        }
        self.textApi = new TextApi($text);

        // setup $borderGap
        $text.wrap(G.format(borderGapTxt, borderId));
        $borderGap = $('#' + borderId);
        if (self.recovery.oldText == null) {
            self.recovery.oldTextareaHtml = $borderGap.html();
        }
        $text.height(self.option.height);
        $borderGap.append(G.format(iframeTxt, viewId));
        $borderGap.wrap(borderTxt);

        // setup $body
        if (self.supportView()) {
            self.$iframe = $('#' + viewId).width($text.width());
            iframe = self.$iframe[0];
            win = iframe.contentWindow || iframe.contentDocument && iframe.contentDocument.defaultView;
            doc = win.document;
            doc.designMode = 'on';
            doc.open();
            doc.writeln(G.format(htmlTxt, self.option.css));
            doc.close();
            $body = $('body', doc);
        }
        self.viewApi = new ViewApi(win, doc);

        // setup actionPanel
        self.mod = 0;
        $actionPanel = $(actionPanelTxt).insertBefore($borderGap.parent());
        $actionPanel.delegate('a[data-operation]', 'click', function(e) {
            e.preventDefault();
            var $this = $(this),
                operation = $this.attr('data-operation'),
                plugin = self.plugins[operation];
            if (plugin && plugin.action) {
                plugin.action.call(this, self, self.mod);
            }
        });

        if (self.supportView()) {
            $actionPanel.html(G.format(actionPanelToggle, actionToggleClass));
            $actionToggle = $actionPanel.children();
            $actionToggle.delegate('a', 'click', function(e) {
                e.preventDefault();
                var $this = $(this),
                    toggle = $this.data('toggle');
                if (toggle === 'view') {
                    self.showEditor();
                } else {
                    self.showSource();
                }
            });
            self.$actionToggleCode = $actionToggle.children().eq(0);
            self.$actionToggleView = $actionToggle.children().eq(1);
            self.$actionToggleCode.css('font-weight', 'bold');

            // 设置初始化的编辑器状态
            if (parseInt(cookies.get(self.cookie), 10) === 1 || self.option.initMod) {
                self.showEditor(true);
            }

            // 设置enter
            $body.keydown(function(e) {
                self.fire('viewKeydown', e);
            });

            // debug显示path
            if (self.option.rendPath) {
                // TODO
                // rendPath( $borderGap.parent() );
            }
        }

        // setup plugins
        self.plugins = {};
        G.each(_plugins, function(v, k) {
            if (v) {
                plugins.push('Editor/' + k + 'Tag');
            }
        });
        G.req(plugins, function() {
            var reqs = Array.prototype.slice.call(arguments, 0);
            G.each(reqs, function(v, i) {
                if (v.beforeSetup) {
                    v.beforeSetup(self);
                }
                var $action = $(v.barHtml).attr('data-operation', v.name);
                if ($actionToggle) {
                    $action.insertBefore($actionToggle);
                } else {
                    $action.appendTo($actionPanel);
                }
                self.plugins[v.name] = v;
                if (v.afterSetup) {
                    v.afterSetup(self);
                }
            });
        });


    }
    Event.extend(Editor);

    Editor.prototype.cookie = 'editorMod';
    Editor.prototype.prefix = 'editor'; // 所有相关id的前缀
    Editor.prototype.update = function(mod) {

    };
    Editor.prototype.showEditor = function(notFocus) {
        if (!this.supportView()) {
            return this;
        }
        if (this.mod === 1) {
            return this;
        }
        this.mod = 1;
        this.$actionToggleView.css('font-weight', 'bold');
        this.$actionToggleCode.css('font-weight', 'normal');
        this.update(1);
        this.textApi.$text.css({
            position: 'absolute',
            left: '-9999px'
        });
        this.$iframe.show();
        this.fire('stateChange', 1);
        cookies.set(this.cookie, 1);
        return this;
    };
    Editor.prototype.showSource = function(notFocus) {
        if (this.mod === 0) {
            return this;
        }
        this.mod = 0;
        this.$actionToggleCode.css('font-weight', 'bold');
        this.$actionToggleView.css('font-weight', 'normal');
        this.update(0);
        this.textApi.$text.css({
            position: 'statc',
            left: 'auto'
        });
        this.$iframe.hide();
        this.fire('stateChange', 0);
        cookies.set(this.cookie, 0);
        return this;
    };
    Editor.prototype.clear = function() {

    };
    Editor.prototype.val = function() {

    };
    Editor.prototype.focus = function() {

    };
    Editor.prototype.remove = function() {

    };
    Editor.prototype.supportView = function() {
        return supportView;
    };

    return Editor;
});