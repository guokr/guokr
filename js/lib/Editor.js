/**
 * 编辑器模块
 * @author mzhou
 * @desc 用于所见即所得的UBB编辑器，而且有弹出框、文件上传等功能，可以配合block模块实现。
 * @version 1.1
 * @log 1.1 修改添加了配置文件中的contentHtml参数，当有此参数时content的子元素会被contentHtml替换，并选取其子元素中的textarea作为编辑器的包装对象
 *      1.2 使用block2替代block
 *      1.3 重构了编辑器，添加了很多特性，支持了多实例，添加了@功能
 *      1.4 支持了设置div为输入框的功能
 *      1.4 使用Overlay替代block2
 */
//@import "Overlay.js"
//@import "ajaxfile.js"
//@import "tab.js"
//@import "UBBUtils.js"
//@import "EditorHelper.js"
//@import "rangy-restore.js"
//@import "TextUtils.js";
//@import "at.js";
G.def( 'Editor', ['UBBUtils', 'Overlay', 'ajaxfile', 'tab', 'EditorHelper', 'cookies', 'rangy-restore', 'TextUtils', 'at'], function(  UBBUtils, Overlay, ajaxfile, tab, EditorHelper, cookies, rangy, TextUtils, at) {
    var idNum  = 0,
        cookie = 'editorMod',
        prefix = 'editor';                   // 所有相关id的前缀
    return function( option ) {
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
                //rendPath: true,                              // 是否在编辑器下方绘制路径
                initMod: parseInt( cookies.get( cookie ) ) || 0 // 编辑器的初始化模式，优先使用配置代码，其次为cookies中的editorMod值，最后为0
            },

            oldTextareaHtml,    // 没有设置contenHtml时用于恢复的html
            oldText,            // 设置contenHtml了之后用于回复的text
            mod,                // 编辑模式, 1为正常模式，0为源代码编辑模式

            editorBlockClose        = prefix+'BlockClose'+idNum,        // 弹出框确认按钮的id
            editorBlockCancel       = prefix+'BlockCancel'+idNum,       // 弹出框取消按钮的id
            editorBlockInput        = prefix+'BlockValue'+idNum,        // 弹出框中输入框的id
            editorBlockTab          = prefix+'BlockTab'+idNum,          // 文件上传弹出框的tab的id
            editorBlockTarget       = prefix+'BlockTarget'+idNum,       // 文件上传弹出框的tab target的id
            editorBlockFileUploader = prefix+'BlockFileUploader'+idNum, // 文件上传弹出框的file面板的id
            editorBlockFileInput    = prefix+'BlockFileInput'+idNum,    // 文件上传弹出框的file输入框的id
            editorBlockFileShow     = prefix+'BlockFileShow'+idNum,     // 文件上传弹出框的file显示框的id
            editorBlockError        = prefix+'BlockError'+idNum,        // 文件上传弹出框的错误提示区
            editorAtTextarea        = prefix+'AtTextarea'+idNum,        // 用于textarea @位置的框的id
            editorToggleCode        = prefix+'ToggleCode'+idNum,        // 编辑器切换链接的id
            editorToggleView        = prefix+'ToggleView'+idNum,        // 同上 
            viewId                  = prefix+'Div'+idNum,               // $view的id
            borderId                = prefix+'Border'+idNum,            // border的id

            _uploaderOption = { fileElementId: editorBlockFileInput }, // 上传相关的设置 例如：{ukey:'xsadas',upType:'daily',dataType:'json',url:''}

            block,                                               // 弹出框
            timer,                                               // at的定时器

            editorHelper,                                        // 编辑器帮助函数

            $textarea,                                           // textarea
            textareaRange,                                       // textarea的range对象

            borderGapTxt = '<div id="{id}" class="gui-ubb-gap"></div>',   // editor-border
            borderTxt = '<div class="gui-ubb-b"></div>',
            $borderGap,                                             // 编辑器的边框

            iframeTxt = '<iframe id="{id}" class="hide gui-ubb-editor" frameborder="0"></iframe>', // iframe的html模板
            htmlTxt   = '<html><head><link href="{css}" rel="stylesheet" type="text/css"></head><body><br/></body></html>',     // iframe内部编辑器的模板
            $iframe,                                                                                                            // 编辑器的iframe
            win,                                                                                                          // 内部windows
            doc,                                                                                                          // 内部document
            $view,                                                                                                              // 编辑器的iframe
            divRange,                                                                                                           // 编辑器range对象

            rememberDivPosition,        // 记录div的选择位置
            rememberTextPosition,       // 记录textarea的选择位置

            actionTxt = '<a class="gui-ubb-{name}" data-operation="{name}" href="javascript:void 0;" title="{title}">{title}</a>',              // action的html模板
            actionPanelTxt = '<div class="gui-ubb-links"></div>',                                                              // action面板的模板
            $actionPanel,                                                                                                      // actionPanel
            $editorToggleCode,                                                                                                 // 切换到代码模式的链接
            $editorToggleView,                                                                                                 // 切换到可视化模式的链接
            _actionsSetting = {
                bold:{title:'加粗'},
                italic:{title:'斜体'},
                link:{
                    title:'插入链接',
                    arg:[
                        '<input id="'+
                        editorBlockInput+
                        '" type="text" value="http://" class="b_txt"/><p class="gui-block-bd-do"><a id="'+
                        editorBlockClose+
                        '" href="#" class="mw_btn">确定</a><a id="'+
                        editorBlockCancel+
                        '" href="#">取消</a></p><p id="'+
                        editorBlockError+
                        '"class="gui-block-error">&nbsp;</p>'
                    ].join('')
                },
                image:{
                    title:'插入图片',
                    arg:[
                        '<ul class="gui-block-tab" id="'+
                        editorBlockTab+
                        '"><li class="current"><a href="javascript:void 0;">上传</a></li><li><a href="javascript:void 0;">外链</a></li></ul><div id="'+
                        editorBlockTarget+
                        '"><div><p class="gui-block-bd-hd"><span class="gui-block-bd-hd-title">选择图片：</span><span class="gui-block-bd-hd-desc">图片大小不超过300K</span></p><p id="'+
                        editorBlockFileUploader+
                        '" class="gui-block-uploader"><input type="file" id="'+
                        editorBlockFileInput+
                        '" name="upfile" class="gui-block-uploader-hide" size="32"><input type="text" id="'+
                        editorBlockFileShow+
                        '" class="b_txt"><input type="button" class="sw_btn" value="浏览"></p></div><div class="hide"><p class="gui-block-bd-hd"><span class="gui-block-bd-hd-title">图片URL地址：</span></p><input id="'+
                        editorBlockInput+
                        '" type="text" value="http://" class="b_txt"/></div><p class="gui-block-bd-do"><a id="'+
                        editorBlockClose+
                        '" href="#" class="mw_btn">确定</a><a id="'+
                        editorBlockCancel+
                        '" href="#">取消</a></p><p id="'+
                        editorBlockError+
                        '" class="gui-block-error">&nbsp;</p></div>'
                    ].join('')
                },
                video:{
                    title:'插入视频',
                    arg:[
                        '<p class="gui-block-bd-intro">请插入视频网站的Flash播放器地址，如<a href="http://www.youku.com" target="_blank">优酷</a>、<a href="http://www.tudou.com" target="_blank">土豆</a>等。</p><input id="'+
                        editorBlockInput+
                        '" type="text" value="http://" class="b_txt"/><p class="gui-block-bd-do"><a id="'+
                        editorBlockClose+
                        '" href="#" class="mw_btn">确定</a><a id="'+
                        editorBlockCancel+
                        '" href="#">取消</a></p><p id="'+
                        editorBlockError+'" class="gui-block-error">&nbsp;</p>'
                    ].join('')
                },
                at: {title:'@TA'},
                ref:{
                    title:'站内内容引用',
                    arg:[
                        '<input id="'+
                        editorBlockInput+
                        '" type="text" value="http://" class="b_txt"/><p class="gui-block-bd-do"><a id="'+
                        editorBlockClose+
                        '" href="#" class="mw_btn">确定</a><a id="'+
                        editorBlockCancel+
                        '" href="#">取消</a></p><p id="'+
                        editorBlockError+
                        '"class="gui-block-error">&nbsp;</p>'
                    ].join('')
                },
                ul: {title:'插入无序列表'},
                ol: {title:'插入有序列表'}
            },
            _actions = {                                     // 所有的操作函数
                /**
                 * demo: function( mod, arg ) {
                 *      this是操作链接的dom对象
                 *      mod表示编辑器现在的模式，1为正常模式,0为源代码编辑模式
                 *      arg表示actionSetting定义的参数
                 */
                bold: function( mod, arg ) {
                    editorHelper.bold( mod );
                },
                italic: function( mod, arg ) {
                    editorHelper.italic( mod );
                },
                link: function( mod, arg ) {
                    showBlock(
                        '插入链接',
                        arg,
                        'link', 
                        function( url ) {
                            restoreSelect();
                            editorHelper.link( mod, url );
                        }
                    );
                },
                image: function( mod, arg ) {
                    showImageBlock(
                        '插入图片',
                        arg,
                        function( url ) {
                            restoreSelect();
                            editorHelper.image( mod, url );
                        }
                    );
                },
                video: function( mod, arg ) {
                    showBlock(
                        '插入视频',
                        arg,
                        'video', 
                        function( url ) {
                            restoreSelect();
                            editorHelper.video( mod, url );
                        }
                    );
                },
                at: function( mod, arg ) {
                    editorHelper.insertText(mod, '@');
                    saveSelect( true );
                    showAtBlock(function( name ) {
                        restoreSelect();
                        editorHelper.insertText(mod, name);
                    });
                },
                ref: function( mod, arg ) {
                    showBlock(
                        '站内内容引用',
                        arg,
                        'ref', 
                        function( url ) {
                            restoreSelect();
                            editorHelper.ref( mod, url );
                        }
                    );
                },
                ul: function( mod, arg ) {
                    restoreSelect();
                    editorHelper.ul( mod );
                },
                ol: function( mod, arg ) {
                    restoreSelect();
                    editorHelper.ol( mod );
                }
            },
            reg = {                                         // 替换html模板用的正则
                id: /{id}/g,
                name: /{name}/g,
                css: /{css}/g,
                title: /{title}/g
            },
            urlReg = /((http|ftp|https):\/\/)?[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:\/~\+#]*[\w\-\@?^=%&amp;\/~\+#])?/,
            loadingTip = '<span><img src="/skin/imgs/loading.gif"/>正在上传，请稍候..</span>',
            uploadId   = 0;  // 正在上传的图片id号，用于避免关闭后依旧插入图片

        /**
         * 判断是否支持可视化模式的编辑
         */
        function supportView() {
            return !G.ua.isIE;
        }

        /**
         * 判断链接是否格式正确
         * @param {string} url  url值
         * @param {string} type 类型：image/link/video
         */
        function validateUrl( url, type ) {
            return urlReg.test( url );
        }

        /**
         * 在block窗口中提示出错！
         * @param {string} html  出错的提示信息
         */
        function error( html ) {
            $('#'+editorBlockError).html( html );
        }

        /**
         * 弹出上传图像的block框
         * @param {string} title    弹出框的标题
         * @param {string} html     弹出框中的html
         * @param {function} success  成功后的回调函数：参数为得到的值
         */
        function showImageBlock( title, html, success ) {
            if ( block.isOpen() ) {
                return;
            }
            var upTab,                  // tab模块对象
                type = 'image';         // 类型，用于validate函数
            function confirm(e) {
                e.preventDefault();
                var index     = upTab.current(),
                    lastError = '上传图片失败，请<a href="/help/" target="_blank">联系客服</a>';
                // 上传图片
                if ( index === 0 ) {
                    var $editorBlockFileInput = $( '#'+editorBlockFileInput );
                    if ( !$editorBlockFileInput.val() ) {
                        error('请先选择一张图片');
                        return;
                    }
                    var $editorBlockFileUploader = $( '#'+editorBlockFileUploader ),
                        loading = $( loadingTip );
                    uploadId++;
                    var id = uploadId; // 避免关闭后依旧插入图片
                    loading.appendTo( $editorBlockFileUploader );
                    ajaxfile(
                        _uploaderOption['ukey'],
                        _uploaderOption['upType'],
                        function( data ) {
                            if ( $.isPlainObject( data ) ) {
                                if ( !data.errnum ) {
                                    if ( id !== uploadId ) {
                                        return;
                                    }
                                    block.close();
                                    success( data.url );
                                } else {
                                    loading.remove();
                                    error( data.errmsg );
                                    $( '#'+editorBlockFileShow ).val('');
                                    $( '#'+editorBlockFileUploader ).removeAttr( 'disabled' );
                                }
                            } else {
                                loading.remove();
                                error( data || lastError );
                                $( '#'+editorBlockFileShow ).val('');
                                $( '#'+editorBlockFileUploader ).removeAttr( 'disabled' );
                            }
                        },
                        function() {
                            loading.remove();
                            error( lastError );
                            $( '#'+editorBlockFileShow ).val('');
                            $( '#'+editorBlockFileUploader ).removeAttr( 'disabled' );
                        },
                        _uploaderOption
                    );
                    $( '#'+editorBlockFileUploader ).attr( 'disabled', 'disabled' );
                }
                // 插入远程图片
                else {
                    var url = $( '#' + editorBlockInput ).val();
                    // 补http://
                    if ( !url.match( /^(http|ftp|https):\/\// ) ) {
                        url = 'http://' + url;
                    }
                    if ( validateUrl( url, type ) ) {
                        block.close();
                        if ( !url.match( /^(http|ftp|https):\/\// ) ) {
                            url = 'http://' + url;
                        }
                        success( url );
                    }
                    else {
                        error( '你输入的网址不正确，请检查一下。有困难，<a href="/help/" target="_blank">联系客服</a>' );
                    }
                }
            }
            function cancel(e) {
                e.preventDefault();
                block.close();
            }
            function initBlock( blockContent ) {
                // 设置标签与fileInput
                upTab = tab( '#'+editorBlockTab, 'li', '#'+editorBlockTarget, 'div', 'current' );
                $( '#'+editorBlockFileInput ).change(function() {
                    var url = $(this).val();
                    $( '#'+editorBlockFileShow ).val( url.replace( /C:[\/\\]fakepath[\/\\]/g, '' ) );
                });
                $( '#'+editorBlockInput ).keypress(function(e) {
                    if ( e.which === 13 ) {
                       confirm(e);
                    }
                }).focus(function() {
                    var $this = $(this);
                    $this.setSelection(0, $this.val().length);
                });
                block.title( title );
            }
            block.open(
                html,
                [
                    {
                        event:'click',
                        selector: '#'+editorBlockClose,
                        func: confirm
                    },
                    {
                        event:'click',
                        selector: '#'+editorBlockCancel,
                        func: cancel
                    }
                ],
                initBlock
            );
        }
        
        /**
         * 弹出block框
         * @param {string} title    弹出框的标题
         * @param {string} html     弹出框中的html
         * @param {string} type     弹出框类型：link/video
         * @param {function} success  成功后的回调函数：参数为得到的值
         */
        function showBlock( title, html, type, success ) {
            if ( block.isOpen() ) {
                return;
            }
            function confirm(e) {
                e.preventDefault();
                var url = $( '#'+editorBlockInput ).val();
                // 补http://
                if ( !url.match( /^(http|ftp|https):\/\// ) ) {
                    url = 'http://' + url;
                }
                if ( validateUrl( url, type ) ) {
                    if ( type === 'video' ) {
                        if ( !UBBUtils.tValidateFlash( url ) ) {
                            error( '你输入的网址不正确，请检查一下。有困难，<a href="/help/" target="_blank">联系客服</a>' );
                            return;
                        }
                    }
                    if ( type === 'ref' ) {
                        if ( !UBBUtils.tValidateRef( url ) ) {
                            error( '仅支持站内内容引用，请填写完整链接');
                            return;
                        }
                    }
                    block.close();
                    success( url );
                } else {
                    error( '你输入的网址不正确，请检查一下。有困难，<a href="/help/" target="_blank">联系客服</a>' );
                }
            }
            function cancel(e) {
                e.preventDefault();
                block.close();
            }
            function initBlock( blockContent ) {
                block.title( title );
                $( '#'+editorBlockInput ).keypress(function(e) {
                    if ( e.which === 13 ) {
                        confirm(e);
                    }
                }).setSelection( 0, 7 );
            }

            block.open(
                html,
                [
                    {
                        event:'click',
                        selector: '#'+editorBlockClose,
                        func: confirm
                    },
                    {
                        event:'click',
                        selector: '#'+editorBlockCancel,
                        func: cancel
                    }
                ],
                initBlock
            );
        }

        /**
         * 显示源代码
         */
        function showSource( notFocus ) {
            if ( !mod ) {
                return this;
            }
            editorHelper.update( mod );
            $iframe.hide();
            $textarea.css({position:'static',left:'auto'}); // 直接hide会导致val方法在IE6下报错
            $editorToggleCode.css( 'font-weight', 'bold' );
            $editorToggleView.css( 'font-weight', 'normal' );
            mod = 0;
            saveMod();
            if ( !notFocus ) {
                editorHelper.focus( 0 );
            }
            return this;
        }

        /**
         * 显示编辑器
         */
        function showEditor( notFocus ) {
            if ( !supportView() ) {
                // alert('你的浏览器不支持可视化模式，请使用chrome、firefox等高级浏览器');
                showSource( notFocus );
                return this;
            }
            if ( mod ) {
                return this;
            }
            editorHelper.update( mod );
            $textarea.css({position:'absolute',left:'-9999px'});
            $iframe.show();
            $editorToggleView.css( 'font-weight', 'bold' );
            $editorToggleCode.css( 'font-weight', 'normal' );
            mod = 1;
            saveMod();
            if( !notFocus ) {
                editorHelper.focus( 1 );
            }
            return this;
        }

        /**
         * 持久化编辑器模式到cookies中
         */
        function saveMod() {
            cookies.set( cookie, mod );
        }

        /**
         * 恢复最后一次鼠标、键盘操作后，恢复选中编辑的内容
         */
        function restoreSelect() {
            // IE6-8
            if ( G.ua.isIE || G.ua.isIE9 ) {
                if ( mod ) {
                    divRange && divRange.select();
                } else {
                    textareaRange && textareaRange.select();
                }
            // NOT IE
            } else if ( !(G.ua.isIE9) ) {
                if ( mod ) {
                    //NOT OPERA
                    if ( !G.ua.isOpera ) {
                        $view.focus();   // fix for firefox 6; 不然没有光标; opera下focus会激活光标，并插入到头部，所以focus必须在restoreSelection前面执行
                        win.focus();     // fix for iframe
                        divRange && rangy.restoreSelection(divRange, true);
                        divRange = null;
                    }
                } else {
                    textareaRange && $textarea.setSelection( textareaRange.start, textareaRange.end );
                }
            }
         }
 
        /**
         * 保存选择内容
         */
        function saveSelect( isAt ) {
            if ( !(G.ua.isIE || G.ua.isIE9) ) {
                if ( mod ) {
                    if ( !G.ua.isOpera ) {
                        divRange && rangy.removeMarkers(divRange);
                        divRange = rangy.saveSelection( win );
                    }
                } else {
                    textareaRange = $textarea.getSelection();
                }
            } else if ( isAt ) {
                if ( mod ) {
                    divRange = document.selection.createRange();
                } else {
                    textareaRange = document.selection.createRange();
                }
            }
        }


        /**
         * 设置切换变量
         * @param {object} $actionPanel 操作面板的jquery对象
         */
        function setupToggle( $actionPanel ) {
            $( '<div class="gui-ubb-toggle"><a href="javascript:void 0;" id="'+editorToggleCode+'" data-toggle="code">代码模式</a>&nbsp;|&nbsp;<a href="javascript:void 0;" id="'+editorToggleView+'" data-toggle="view">可视化模式</a></div>' )
                .appendTo( $actionPanel );
            $editorToggleCode = $( '#'+editorToggleCode );
            $editorToggleView = $( '#'+editorToggleView );
            $actionPanel.delegate( '#'+editorToggleCode+','+'#'+editorToggleView, 'click', function( e ) {
                e.preventDefault();
                var $this  = $(this),
                    action = $this.attr( 'data-toggle' );
                if ( action === 'code' ) {
                    showSource();
                } else {
                    showEditor();
                }
            });
            if ( !mod ) {
                $editorToggleCode.css( 'font-weight', 'bold' );
            }
        }

        /**
         * 设置编辑器@功能
         * @param {object} $textarea 输入框
         * @param {object} $view 编辑器
         */
        function setupAt( $textarea, $view) {
            /**
             * 先保存选择区域，然后显示@
             */
            function doAt() {
                saveSelect( true );
                showAtBlock(function( name ) {
                    restoreSelect();
                    editorHelper.insertText(mod, name);
                });
            }

            /**
             * 监控$view的@输入
             */
            var oldHtml = $view.html();
            (function detectDivAt() {
                if( mod ) {
                    var html = $view.html().replace( /<span[^>]+>\ufeff<\/span>/ig, '');     // 为了去掉doAt插入的span
                    if ( oldHtml !== html ) {
                        oldHtml = html;
                        var sel = rangy.getSelection( win ),
                            range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null ;
                        if ( range && range.collapsed && range.startContainer.nodeType === 3 ) {
                            if (range.startContainer.data.slice( range.startOffset-1, range.startOffset ) === '@') {
                                doAt();
                            }
                        }
                    }
                }
                timer = setTimeout( detectDivAt, 50);
            })();

            /**
             * 监控textarea的@输入
             */
            function detectTextAt() {
                setTimeout(function() { // input事件会在chrome下在@输入之前触发，onpropertychange在输入@的时候触发奇怪，导致IE！
                    var sel = $textarea.getSelection(),
                        start = $textarea[0].value.slice( 0, sel.start );  // $textarea.val() 会把value里面的\r去掉
                    if ( start.slice(-1) === '@' ) {
                        doAt();
                    }
                });
            }
            if ( window.addEventListener ) {
                // input有输入的时候执行
                $textarea[0].addEventListener('input', detectTextAt, false); // 必须设置不使用事件捕获，否则会在firefox 5.0.1上与百度统计冲突
            } else if ( window.attachEvent ) {
                // input值改变的时候执行
                $textarea[0].attachEvent('onpropertychange', function() {
                    if ( window.event.propertyName == 'value' ) {
                        detectTextAt();
                    }
                });
            }
        }

        /**
         * 设置回车时只输入<br/>
         * @param {object} $view 编辑器
         */
        function setupKey( $view ) {
            $view.keydown(function( e ) {
                // br
                if ( e.which === 13 && editorHelper.br() ) {
                    e.preventDefault();
                // backspace
                } else if ( e.which === 8 && editorHelper.backspace() ) {
                    e.preventDefault();
                }
            });
        }

        /**
         * 因为ie对pre的innerHTML支持不友好，无法保留字符串里面的换行，所以替换为<br/>
         * IE的textarea里面中文之后的空格和英文之后的空格宽度不一，通过设置font-family为宋体来模拟中文后的空格
         */
        function replaceAfter($0, $1, $2, $3) {
            var s = ($1||'') + ($2||''),
                isChinese = $1.slice(-1).match(/[\u3000-\u303F\u3400-\u4db5\u4e00-\u9fa5]/);
            for ( var i=0,l=$3.length;i<l;i++ ) {
                s += isChinese ? '<span style="font-family:simsun;">&nbsp;</span>' : '<span>&nbsp;</span>';
            }
            return s;
        }

        /**
         * 显示at框
         * @param {function} cb 成功后的回调函数
         */
        function showAtBlock( cb ) {
            if ( mod ) {
                var atPos = rangy.getCaretPosition(win);
                if ( atPos ) {
                    var pos = $iframe.offset();
                    // 确保编辑器高度改变时候依旧ok
                    atPos.top += pos.top;
                    atPos.left += pos.left;
                    atPos.top -= (5 + $(win).scrollTop());
                    at(atPos, cb, function() {
                        restoreSelect();
                    }, $view);
                }
            } else {
                if ( !showAtBlock.$pre ) {
                    showAtBlock.$pre = $('<div class="gui-ubb-pre"></div>')
                                            .width($textarea.width())
                                            .height($textarea.height())
                                            .appendTo($borderGap);
                }

                var sel = $textarea.getSelection(),
                    txt = $textarea[0].value,       // $textarea.val() 会把value里面的\r去掉
                    atPos;
                if ( sel.length === 0 ) {
                    var pos = $textarea.offset(),
                        start = txt.slice(0, sel.start),
                        end = txt.slice(sel.end);
                    start = start.replace( /\n/g, '<br/>').replace(/([\w\W])((?:<br\/>)*)(\s+)/gm, replaceAfter);
                    end = end.replace( /\n/g, '<br/>').replace(/([\w\W])((?:<br\/>)*)(\s+)/gm, replaceAfter);
                    showAtBlock.$pre.html(start + '<span id="'+editorAtTextarea+'">@</span>' + end);
                    atPos = $( '#'+editorAtTextarea ).offset();
                    atPos.top -= (5 + $textarea.scrollTop());
                    at(atPos, cb, function() {
                        restoreSelect();
                    }, $view);
                }
            }
        }

        /**
         * 用于debug时显示光标或选中开始区域的node路径
         * @param {object} $editor 编辑器的jquery Object
         */
        function rendPath( $editor ) {
            if ( !win ) {
                return;
            }
            setInterval(function() {
                if ( !mod ) {
                    return;
                }
                var sel = rangy.getSelection( win ),
                    range = sel.rangeCount ? sel.getRangeAt(0) : null,
                    node,
                    list = [];
                if ( range && (node = range.startContainer) && (node != rendPath.node) ) {
                    rendPath.node = node;
                    do {
                        list.push( node.nodeName.toLowerCase() );
                        node = node.parentNode;
                    } while( node && node.nodeName.toLowerCase() !== 'html' );
                    list.reverse();
                    if ( rendPath.$path ) {
                        rendPath.$path.html('<ul class="breadcrumb"><li>'+list.join('</li><li>')+'</li></ul>');
                    } else {
                        rendPath.$path = $('<div class="gui-ubb-path"><ul class="breadcrumb"><li>'+list.join('</li><li>')+'</li></ul></div>')
                                        .insertAfter( $editor );
                    }
                }
            }, 500);
        }

        /**
         * 初始化
         */
        function init() {
            $.extend( _option, option );
            $.extend( _actions, _option.actions );
            $.extend( _actionsSetting, _option.actionsSetting );
            $.extend( _uploaderOption, _option.uploaderOption );
            $textarea    = $( _option.content );

            rangy.init();

            var title,                             // 每个操作的title
                setting;                           // 每个操作的setting

            // 如果设置了contentHtml，就以此为textarea
            if ( _option.contentHtml ) {
                oldText = $textarea.html();
                $textarea.html( option.contentHtml );
                $textarea = $('textarea', $textarea);
                if ( _option.defaultValue != null ) {
                    $textarea.val( _option.defaultValue || '\n' );
                } else {
                    $textarea.val( oldText );
                }
            }

            // 初始化$borderGap
            $textarea.wrap(
                borderGapTxt.replace( reg.id, borderId )
            );
            $borderGap = $( '#'+borderId );
            if ( oldText == null ) {
                oldTextareaHtml = $borderGap.html();
            }
            $textarea.height( _option.height );
            $borderGap.append(
                iframeTxt.replace( reg.id, viewId )
            );
            $borderGap.wrap( borderTxt );

            // 初始化$view
            $iframe = $( '#'+viewId ).width( $textarea.width() );
            win = rangy.dom.getIframeWindow( $iframe[0] );
            doc = win.document;
            doc.designMode = 'On';
            doc.open();
            doc.writeln(
                htmlTxt.replace( reg.css, _option.css )
            );
            doc.close();
            $view = $( 'body', doc );
            // if ( !_option.autoHeight || G.ua.isIE ) {
                $iframe.height( _option.height );
            // } else {
                // $iframe.css( 'min-height', _option.height );
            // }

            // other
            editorHelper = new EditorHelper( $textarea, win, doc, $view );
            if ( (G.ua.isIE9 || G.ua.isIE) && document.selection ) {
                // $view
                rememberDivPosition = function () {
                    divRange = document.selection.createRange();
                }
                $view.mouseup( rememberDivPosition )
                    .keyup( rememberDivPosition );
                // textarea
                rememberTextPosition = function () {
                    textareaRange = document.selection.createRange();
                }
                $textarea.mouseup( rememberTextPosition )
                         .keyup( rememberTextPosition );
            }

            // 初始化action
            $actionPanel = $( actionPanelTxt ).insertBefore( $borderGap.parent() );
            for ( var action in _actionsSetting ) {
                setting = _actionsSetting[ action ];
                // 如果不存在
                if ( setting == null ) {
                    continue;
                }
                title = G.isFun( setting.title ) ? setting.title( _option.initMod ) : setting.title;
                $(
                    actionTxt.replace( reg.name, action )
                             .replace( reg.title, title )
                ).appendTo( $actionPanel );
            }
            $actionPanel.delegate( 'a[data-operation]', 'click', function( e ) {
                e.preventDefault();
                var $this = $(this),
                    operation = $this.attr('data-operation');
                if ( operation !== 'at' ) {
                    saveSelect();
                }
                _actions[operation].call( this, mod, _actionsSetting[operation].arg );
            });
            if ( supportView() ) {
                setupToggle( $actionPanel );
                // 设置初始化的编辑器状态
                if ( _option.initMod ) {
                    showEditor( true );
                }
                // 设置enter
                setupKey( $view );
                // debug显示path
                if ( _option.rendPath ) {
                    rendPath( $borderGap.parent() );
                }
            }

            // 初始化@功能
            setupAt( $textarea, $view );

            // 初始化block 模块
            block = new Overlay();
            block.closeCallBack(function() {
                uploadId = 0;
                return true;
            });
        }

        init();

        /**
         * 如果处于可视化编辑模式则格式化html成ubb，并设置textarea的值
         * 如果处于源代码模式则格式化ubb成html，并设置$view的html显示
         */
        this.update = function() {
            editorHelper.update();
            return this;
        };
        /**
         * 进入可视化编辑模式
         */
        this.showEditor = showEditor;
        /**
         * 进入源码编辑模式
         */
        this.showSource = showSource;
        this.clear = function() {
            $textarea.val( '' );
            $view.html( '' );
        };
        this.val = function( s ) {
            if ( s && typeof s === 'string' ) {
                editorHelper.val( mod, s );
                return this;
            } else {
                return editorHelper.val( mod );
            }
        };
        this.focus = function() {
            editorHelper.focus( mod );
        };
        /**
         * 恢复最后一次鼠标、键盘操作后选中的$view里面的内容
         */
        this.restoreSelect = restoreSelect;
        /**
         * 移除编辑器，清理内存
         */
        this.remove = function() {
            $actionPanel.remove();
            if ( oldText == null ) {
                $borderGap.parent()
                          .replaceWith( oldTextareaHtml );
            } else {
                $( _option.content ).html( oldText );
            }
            editorHelper = null;
            timer && clearTimeout( timer );
        };
        this.helper = EditorHelper;
    };
});
