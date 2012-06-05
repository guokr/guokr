/**
 * 编辑器模块
 * @author mzhou
 * @desc 编辑器帮助库
 * @version 1.0
 */
//@import "UBBUtils.js";
//@import "TextUtils.js";
//@import "rangy.js";
G.def( 'EditorHelper', ['TextUtils','UBBUtils','rangy'], function( TextUtils, UBBUtils, rangy ) {
    var notEdit = {embed:1,object:1,img:1,br:1,a:1},
        refClass= 'gui-ubb-ref',
        noBrs = {
            div: function( node ) {
                var klass = node.getAttribute('class');
                return klass === refClass;
            },
            a: 1,
            embed: 1,
            object: 1
        },
        Util = {};
    /**
     * 将HTML转换成UBB
     */
    Util.htmlToUbb = function( HTML ) {
        HTML = UBBUtils.tHTML2XHTML(HTML);
        HTML = UBBUtils.tHTMLClear(HTML);
        HTML = UBBUtils.tXHTML2UBB(HTML);
        return HTML;
    };

    /**
     * 将UBB转换成HTML
     * 末尾补<br />。修复末尾没有换行时候，必须两次回车才能换行的bug
     */
    Util.ubbToHtml = function( UBB ) {
        return UBBUtils.tUBB2XHTML(UBB);
    };

    /**
     * 可视化编辑模式插入html，如果没有选中则插入到最后
     * @param {dom} node 被插入的节点
     * @param {string} html html字符串
     */
    Util.insertHtml = function( win, node, html ) {
        var sel = rangy.getSelection( win ),
            doc = win.document,
            range;
        // 获取range
        // 如果没有选中，则插入到node最后
        if ( !sel.rangeCount ) {
            range = Util.insertCaretAtLast( win, node );
        // 如果光标在node里面
        } else {
            range = sel.getRangeAt(0);
            // 如果光标没有在node里面，则插入到node最后
            if ( !rangy.dom.isAncestorOf(node, range.startContainer, true)
               || !rangy.dom.isAncestorOf(node, range.endContainer, true) ) {
                range = Util.insertCaretAtLast( win, node );
            }
        }

        // html字符串
        if ( typeof html === 'string' ) {
            var fragment = doc.createDocumentFragment(),
                $nodes = $(html, doc),
                l = $nodes.length,
                last = $nodes[l-1];
            for ( var i=0; i<l; i++ ) {
                fragment.appendChild( $nodes[i] );
            }
            range.insertNode( fragment );
        // 单个dom节点
        } else {
            var last = html;
            range.insertNode( last );
        }

        // 设置光标
        node.focus();   // fix for firefox 6; 不然没有光标; opera下focus会激活光标，并插入到头部，所以focus必须在restoreSelection前面执行
        win.focus();    // fix for iframe
        // 如果是光标不能插入的元素，则光标放到他后面
        if ( notEdit[last.nodeName.toLowerCase()] ) {
            var parent = last.parentNode,
                siblings = parent.childNodes,
                ll = siblings.length;
            for ( var j=0;j<ll;j++) {
                if ( siblings[j] == last ) {
                    break;
                }
            }
            sel.collapse( last.parentNode, j+1 );
        // 如果是光标能插入的元素，则光标放到元素最后
        } else {
            sel.collapse( last, last.nodeType === 3 ? last.length : 1 );
        }
    };
    
    /**
     * 根据tagName查找node的父元素以上的标记
     * @param {dpm} node 节点
     * @param {string/array} tagName 标签名称
     * @param {boolean} includeSelf 包含自己
     * @returns {dom} 返回祖先节点
     */
    Util.findParentByTagName = function( node, tagName, includeSelf ) {
        if (node && node.nodeType && !this.isBody(node)) {
            tagName = !G.isArray(tagName) ? [tagName] : tagName;
            node = node.nodeType == 3 || !includeSelf ? node.parentNode : node;
            while (node && node.tagName && node.nodeType != 9) {
                if ( ~tagName.indexOf( node.tagName.toLowerCase() ) ) {
                    return node;
                }
                node = node.parentNode;
            }
        }

        return null;
    };

    /**
     * 设置光标位置
     * @param {object} win 
     * @param {dom} node
     * @param {number} offset
     */
    Util.setCursor = function( win, node, offset ) {
        var sel = rangy.getSelection( win ),
            range = rangy.createRange( win.document );
        range.setStart( node, offset );
        sel.setSingleRange( range );
        // 设置光标
        node.focus();   // fix for firefox 6; 不然没有光标; opera下focus会激活光标，并插入到头部，所以focus必须在restoreSelection前面执行
        win.focus();    // fix for iframe
    };

    /**
     * 设置光标在指定node之前
     * @param {object} win 
     * @param {dom} node
     */
    Util.setCursorBefore = function( win, node ) {
        var sel = rangy.getSelection( win ),
            range = rangy.createRange( win.document );
        range.setStartBefore( node, offset );
        sel.setSingleRange( range );
        // 设置光标
        node.parentNode.focus();   // fix for firefox 6; 不然没有光标; opera下focus会激活光标，并插入到头部，所以focus必须在restoreSelection前面执行
        win.focus();    // fix for iframe
    };

    /**
     * 设置光标在指定node之后
     * @param {object} win 
     * @param {dom} node
     */
    Util.setCursorAfter = function( win, node ) {
        var sel = rangy.getSelection( win ),
            range = rangy.createRange( win.document );
        range.setStartAfter( node, offset );
        sel.setSingleRange( range );
        // 设置光标
        node.parentNode.focus();   // fix for firefox 6; 不然没有光标; opera下focus会激活光标，并插入到头部，所以focus必须在restoreSelection前面执行
        win.focus();    // fix for iframe
    };

    /**
     * 判断是否body
     * @param {dom} node 节点
     * @return {boolean}   是否是body节点
     */
    Util.isBody = function(node) {
        return  node && node.nodeType == 1 && node.tagName.toLowerCase() == 'body';
    };

    /**
     * 在$view最后插入光标
     * TODO not work for firefox
     * @param {dom} node 被插入光标的节点
     * @return {object} range 光标的range
     */
    Util.insertCaretAtLast = function( win, node ) {
        var doc = win.document;
        node.focus();   // fix for firefox 6; 不然没有光标; opera下focus会激活光标，并插入到头部，所以focus必须在restoreSelection前面执行
        win.focus();    // fix for iframe
        var range = rangy.createRange( doc );
        range.selectNodeContents( node );
        range.collapse();
        rangy.getSelection( win ).setSingleRange( range, true );
        return range;
    };

    function EditorHelper( $textarea, win, doc, $view ) {
        this.$textarea = $textarea;
        this.win = win;
        this.doc = doc;
        this.$view = $view;
    };
    EditorHelper.prototype.bold = function( mod ) {
        if ( mod ) {
            this.doc.execCommand( 'bold', false, '' );
        } else {
            this.$textarea.surroundSelectedText( '[bold]', '[/bold]' );
        }
        return this;
    };
    EditorHelper.prototype.italic = function( mod ) {
        if ( mod ) {
            this.doc.execCommand( 'italic', false, '' );
        } else {
            this.$textarea.surroundSelectedText( '[italic]', '[/italic]' );
        }
        return this;
    };
    EditorHelper.prototype.link = function( mod, url ) {
        if ( mod ) {
            var len,
                range;
            if ( this.doc.selection ) {
                range = this.doc.selection.createRange();
                len = range.text.length;
            } else {
                range = this.win.getSelection().getRangeAt(0);
                len = range.collapsed ? 0 : 1;
            }

            // 未选中
            if ( len === 0 ) {
                Util.insertHtml( this.win, this.$view[0], UBBUtils.tHTMLTag( 'link', url ) );
            // 已选中
            } else {
                this.doc.execCommand( 'createLink', false, url );
            }
        } else {
            var selected = this.$textarea.getSelection();
            this.$textarea.replaceSelectedText( UBBUtils.tUBBTag( 'link', url, selected && selected.text ) );
        }
        return this;
    };
    EditorHelper.prototype.image = function( mod, url ) {
        if ( mod ) {
            // this.doc.execCommand( 'insertimage', false, url);
            Util.insertHtml( this.win, this.$view[0], UBBUtils.tHTMLTag( 'image', url ) );
        } else {
            var selected = this.$textarea.getSelection();
            this.$textarea.insertText( UBBUtils.tUBBTag( 'image', url ), selected && selected.end, true );
        }
        return this;
    };
    EditorHelper.prototype.video = function( mod, url ) {
        if ( mod ) {
            var tmpl = UBBUtils.tHTMLTag( 'video', url );
            Util.insertHtml( this.win, this.$view[0], tmpl );
        } else {
            var selected = this.$textarea.getSelection();
            this.$textarea.insertText( UBBUtils.tUBBTag( 'video', url ), selected && selected.end, true );
        }
        return this;
    };
    EditorHelper.prototype.br = function() {
        /*var sel = rangy.getSelection( this.win ),
            div = this.$view[0],
            last = div.lastChild,
            range = sel.getRangeAt(0),
            html = '<br/>';
        // 如果是最后一行
        if ( last != null && rangy.dom.comparePoints( range.endContainer, range.endOffset, last, last.nodeType === 3 ? last.length : last.childNodes.length ) >= 0 ) {
            Util.insertCaretAtLast( this.win, div );
        }
        Util.insertHtml( this.win, div, html );
        // 目前发现chrome和IE9会有滚动条无法自动下滑的bug
        // 不过那些高级浏览器性能好，且难以精确的特征定位所以计算一下也无妨
        if ( !G.ua.isIE ) {
            var $win = $(this.win),
                cursorTop = rangy.getCaretPosition( this.win ).top,
                scrollTop = $win.scrollTop(),
                winHeight = $win.height(),
                lineHeight = 1.5 * parseInt( this.$view.css('font-size') );
            if ( cursorTop > (winHeight + scrollTop - lineHeight) ) {
                $win.scrollTop( cursorTop - winHeight + lineHeight );
            }
        }*/
        var sel = rangy.getSelection( this.win ),
            range = sel.getRangeAt(0),
            container = range.endContainer.nodeType === 3 ? range.endContainer.parentNode : range.endContainer,
            tagName = container.nodeName.toLowerCase(),
            noBr = noBrs[tagName],
            parent = container.parentNode;
        // 那些内部不能换行的元素
        if ( noBr && (G.isFun(noBr) ? noBr(container) : noBr) ) {
            var br = document.createElement('br'),
                t = rangy.createRange( this.doc );
            // 向上
            if ( range.endOffset === 0 ) {
                $(br).insertBefore(container);
                t.setStartBefore( br );
            // 向下
            } else {
                $(br).insertAfter(container);
                t.setStartBefore(br);
            }
            // 如果是内部不能插入换行的元素，则选中当前元素
            t.collapse( true );
            rangy.getSelection( this.win ).setSingleRange( t );
            return true;
        }
        return false;
    };
    EditorHelper.prototype.insertText = function( mod, name ) {
        if ( mod ) {
            Util.insertHtml( this.win, this.$view[0], this.doc.createTextNode(name) );
        } else {
            var selected = this.$textarea.getSelection();
            this.$textarea.insertText( name, selected && selected.end, true );
        }
        return this;
    };
    EditorHelper.prototype.update = function( mod ) {
        if ( mod ) {
            this.$textarea.val(
                Util.htmlToUbb( this.$view.html() )
            );
        } else {
            this.$view.html(
                Util.ubbToHtml( this.$textarea.val() )
            );
        }
        return this;
    };
    EditorHelper.prototype.val = function( mod, ubb ) {
        if ( ubb && typeof ubb === 'string' ) {
            this.$textarea.val( ubb );
            if ( mod ) {
                this.$view.html(
                    Util.ubbToHtml( ubb )
                );
            }
            return this;
        } else {
            // 如果是代码模式则将先ubb转换成html
            if ( !mod ) {
                this.$view.html(
                    Util.ubbToHtml( this.$textarea.val() )
                );
            }
            // 然后将html转换成ubb
            this.$textarea.val(
                Util.htmlToUbb( this.$view.html() )
            );
            // 此处做这些转换是为了利用浏览器自身的机制来去掉不匹配的ubb标签
            return this.$textarea.val();
        }
    };
    EditorHelper.prototype.focus = function( mod ) {
        if ( mod ) {
            Util.insertCaretAtLast( this.win, this.$view[0] );
        } else {
            this.$textarea.insertCaret();
        }
        return this;
    };
    EditorHelper.prototype.ref = function( mod, url ) {
        if ( mod ) {
            Util.insertHtml( this.win, this.$view[0], UBBUtils.tHTMLTag( 'ref', url ) );
        } else {
            var selected = this.$textarea.getSelection();
            this.$textarea.insertText( UBBUtils.tUBBTag( 'ref', url ), selected && selected.end, true );
        }
        return this;
    };
    EditorHelper.prototype.backspace = function() {
        var sel = rangy.getSelection( this.win ),
            range = sel.getRangeAt(0);
        if ( range.collapsed ) {
            var start = range.startContainer;
            if ( start.nodeType !== 3 ) {
            }

        }
        return false;
    };
    EditorHelper.prototype.ul = function( mod ) {
        if ( mod ) {
            /*
            var sel = rangy.getSelection( this.win );
            if ( !sel.rangeCount ) {
                return;
            }
            range = sel.getRangeAt(0);
            // 如果是直接插入
            if ( range.collapsed ) {
                var ulStyles = {
                        disc: 1,
                        circle: 1,
                        square: 1
                    },
                    start = range.startContainer,
                    $start = $(start),
                    $li = $( Util.findParentByTagName( start, 'li' ) ),
                    $ul = $li.parent(),
                    style = $li.length ? $li.css('list-style-type') : 'none';
                // 如果都没在，则直接插入ul到body上
                if ( style === 'none' ) {
                    Util.insertHtml( this.win, this.$view[0], UBBUtils.tHTMLTag( 'ul' ) );
                // 如果在ul中,则撤销掉ul
                } else if ( ulStyles[ style ] ) {
                    var newNode = $($li.html()).insertBefore( $ul )[0];
                    // 如果此ul没有其他的li，则直接去掉li
                    if ( !$li.siblings('li').length ) {
                        $ul.remove();
                    } else {
                        $li.remove();
                    }
                // 如果是在ol中,则切换ol为ul
                } else {

                }
            } else {

            }
             */
            this.doc.execCommand('insertunorderedlist', false, '');
        } else {
            this.$textarea.surroundSelectedText( '[ul]\n', '\n[/ul]' );
        }
        return this;
    };
    EditorHelper.prototype.ol = function( mod ) {
        if ( mod ) {
            this.doc.execCommand('insertorderedlist', false, '');
        } else {
            this.$textarea.surroundSelectedText( '[ol]\n', '\n[/ol]' );
        }
        return this;
    };
    return EditorHelper;
});
