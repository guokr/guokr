/**
 * UBB与html的转换库
 * @author mzhou
 * @version 0.2
 * @log 0.1 完成HTMLtoUBB方法
 *      0.2 完成UBBtoHTML
 */


/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false, g_obj_id:true */


//@import "Node.js";
G.def( 'UBB', ['Node'], function (Node) {
    'use strict';
    var Util = {

            /*inlineUbbTags: ['#text','bold','italic','color','url','image','video'],*/
            /**
             * 判断display样式是否是换行的样式
             */
            isBlock: function( displayStyle ) {
                return ~$.inArray( displayStyle, [
                    'block',
                    'table',
                    'table-cell',
                    'table-caption',
                    'table-footer-group',
                    'table-header-group',
                    'table-row',
                    'table-row-group'
                ]);
            },
            /**
             * 判断一个样式是否为bold
             */
            isBold: function( fontWeight ) {
                var number = parseInt( fontWeight, 10 );
                if( isNaN(number) ) {
                    return (/^(bold|bolder)$/).test( fontWeight );
                } else {
                    return number > 400;
                }
            },
            /**
             * 判断一个样式是否为bold
             */
            isItalic: function( fontWeight ) {
                return (/^(italic|oblique)$/).test( fontWeight );
            },
            /**
             * 判断是否是一个有序列表
             */
            isOrderedList: function( listStyleType ) {
                return listStyleType !== 'none' && !this.isUnOrderedList( listStyleType );
            },
            /**
             * 判断是否是一个无序列表
             */
            isUnOrderedList: function( listStyleType ) {
                return (/^(disc|circle|square)$/).test( listStyleType );
            },
            /**
             * 解析list，ul、ol或者是其他list-style符合的元素
             * @param {object} $node 节点
             */
            parseListNode: function( $node, parentNode ) {
                var start = new Node(),
                    listStyleType = $node.css('list-style-type');
                if ( listStyleType === 'none' ) {
                    return [start];
                }
                var listType = this.isUnOrderedList( listStyleType ) ? 'ul' :'ol';
                start.tagName = 'li';
                // 如果有父元素，且其祖先元素有tag为ul或ol
                if ( parentNode && (parentNode = parentNode.findAncestorByTagName(['ul','ol'], true)) ) {
                    // 如果父元素的listType与li的listType相同，则略过，即默认添加
                    if ( parentNode.tagName !== listType ) {
                        // 修改父节点tagName
                        parentNode.tagName = listType;
                    }
                    // 如果不同则重新生成一个ul/ol
                    return [start];
                // 如果没有父元素为ul/ol
                } else {
                    var n = new Node();
                    n.tagName = 'li';
                    start.tagName = listType;
                    start.append( n );
                    return [start, n];
                }
            },
            /**
             * 将颜色值转行成Hex方式展示
             * @param {string} oldColor
             * @return {string} hex格式的颜色值
             */
            RGBtoHEX: function ( oldColor ) {
                var i,
                    RGB2HexValue = '',
                    numbers,
                    regExp = /([0-9]+)[, ]+([0-9]+)[, ]+([0-9]+)/,
                    array = regExp.exec(oldColor);
                if (!array) {
                    if ( oldColor.length === 4 ) {
                        numbers = oldColor.split('').slice(1);
                        RGB2HexValue = '#';
                        for ( i=0; i<3; i++ ) {
                            RGB2HexValue += numbers[i]+numbers[i];
                        }
                    } else {
                        RGB2HexValue = oldColor;
                    }
                } else {
                    for (i = 1; i < array.length; i++) {
                        RGB2HexValue += ('0' + parseInt(array[i], 10).toString(16)).slice(-2);
                    }
                    RGB2HexValue = '#' + RGB2HexValue;
                }
                return RGB2HexValue;
            },
            /**
             * 处理换行、空格、&nbsp;
             * 不处理自动换行
             * @param {object} $node 节点
             * @param {object} re 对象
             * @param {object} setting 配置
             * @return {boolean} 是否需要转换成节点
             */
            parseTextNode: function( $node, start, setting ) {
                start.tagName = '#text';
                var text = $node.text(),
                    n;
                // 如果没有字符传
                if ( !text ) {
                    return false;
                }
                var $container = $node.parent(),
                    color;
                if ( !setting.keepWhiteSpace ) {
                    text = $.trim(text)
                            .replace(/\s{2,}/g,'');
                }
                if ( !setting.keepNewLine ) {
                    text = text.replace(/\n/g,'');
                }
                if ( text === '' ) {
                    return false;
                }
                start.value = text;

                // inline 样式在这里处理
                if ( Util.isBold( $container.css('font-weight') ) ) {
                    n = start.clone();
                    start.tagName = 'bold';
                    start.value = null;
                    start.append(n);
                }
                if ( Util.isItalic( $container.css('font-style') ) ) {
                    n = start.clone(true);
                    start.tagName = 'italic';
                    start.value = null;
                    start.detachChildren();
                    start.append(n);
                }
                if ( (color = Util.RGBtoHEX($container.css('color'))) && color !== setting.defaultColor && !($container[0].nodeName.toLowerCase() === 'a' && color === setting.linkDefaultColor ) ) {
                    n = start.clone(true);
                    start.tagName = 'color';
                    start.attr( 'color',  color );
                    start.value = null;
                    start.detachChildren();
                    start.append(n);
                }
                return true;
            },
            /**
             * 解析单个jquery object为Node 对象
             * @param {object} $node jquery object
             * @param {object} currentNode 当前解析完成的节点(即父节点)
             * @param {object} setting 配置
             * @return {object/array} 返回解析之后的节点，如果这个节点不需要则返回空，如果是一个dom解析成多个节点则返回数组:[start, end]
             */
            parse$Node: function( $node, currentNode, setting ) {
                if ( setting.filter ) {
                    var i = 0,
                        filterR,
                        l = setting.filter.length;
                    for ( ; i<l; i++ ) {
                        filterR = setting.filter[i].node( $node, currentNode, setting );
                        if ( !filterR ) {
                            return null;
                        } else if ( filterR.isNode ) {
                            return filterR;
                        }
                    }
                }
                var tmp,
                    start,                                  // 开始节点
                    end,                                    // 结束节点
                    node = $node[0],                        // 元素的dom
                    nodeName = node.nodeName.toLowerCase(),
                    nodeType = node.nodeType,
                    href,
                    display;
                if ( nodeType === 8 ) {
                    return;
                }
                if ( nodeType !== 3 ) { // fix firefox bug
                    display = $node.css('display');
                    // list
                    if( display === 'list-item' ) {
                        // 重新定位到另一个新生成的父节点
                        tmp = Util.parseListNode( $node, currentNode );
                        start = tmp[0];
                        end = tmp[1];
                    } else {
                        start = new Node();
                    }

                    // block
                    if( Util.isBlock( display ) ) {
                        start.tagName = '#line';
                        start.attr( '_isBlock', true );
                        start.attr( '_isWrap', $node.height() > 0 ); // 根据高度，判断block元素是否是表现为一行
                    }
                } else {
                    start = new Node();
                }

                switch( nodeName ) {
                    case 'img':
                        start.value = $node.data('src');
                        // 处理图片
                        if ( !start.value ) {
                            start.value = $node.attr('src');
                            start.tagName = 'image';
                        // 处理视频
                        } else {
                            start.tagName = 'video';
                        }
                        break;
                    case 'embed':
                        // 处理swf
                        // 此处跳过
                        break;
                    case 'a':
                        // 处理a标签
                        start.tagName = 'url';
                        href = $node.attr('href');
                        start.attr( 'href', href );
                        break;
                    case 'blockquote':
                        // 处理blockquote
                        start.tagName = 'blockquote';
                        break;
                    case 'ul':
                        start.tagName = 'ul';
                        break;
                    case 'ol':
                        start.tagName = 'ol';
                        break;
                    case '#text':
                        // 处理文本节点
                        if ( !Util.parseTextNode( $node, start, setting ) ) {
                            return;
                        }
                        break;
                    case 'br':
                        start.tagName = 'br';
                        break;
                    default:
                        break;
                }
                return end ? [start, end] : start;
            },
            /**
             * 生成一行
             *  如果前一节点最后有换行属性showLastNewLine，那本节点就不在前面加换行。
             *  字符串结束加换行
             * @param {object} node 节点
             * @param {string} sonString 字符串
             * @param {array} re 数组
             */
            drawLine: function( node, sonString, re ) {
                var prev;
                if ( node.attr('_isWrap') !== false ) {
                    if ( !node.isFirst() && !node.prev().attr( '_showLastNewLine' ) ) {
                        re.push('\n');
                    }
                    re.push(sonString);
                    if ( !node.isLast() ) {
                        re.push('\n');
                        node.attr( '_showLastNewLine', true );
                    }
                } else if( (prev=node.prev()) && (!prev.attr('_isBlock') && prev.tagName !== 'br') ) {
                    re.push('\n');
                    node.attr( '_showLastNewLine', true );
                }
            },
            /**
             * 生成每个节点对应的字符串
             * @param {object} node 节点
             * @return {string} 字符串
             */
            rendUbbTag: function( node, sonString ) {
                var re = [];
                switch( node.tagName ) {
                    case '#line':
                        /*var children,
                            prevTag;
                        if (node.parent()
                            && (prevTag = node.prev())
                            && prevTag.tagName !== 'br'
                            && (children = node.children())
                            && children.length
                            && children[0].tagName === '#text' ) {
                            re.push('\n');
                        }*/
                        Util.drawLine( node, sonString, re );
                        break;
                    case '#text':
                        re.push(node.value);
                        break;
                    case 'color':
                        re.push('[color=');
                        re.push( node.attr('color') );
                        re.push(']');
                        re.push(sonString);
                        re.push('[/color]');
                        break;
                    case 'li':
                        Util.drawLine( node, sonString, re );
                        break;
                    case 'ul':
                        Util.drawLine( node, '[ul]\n'+sonString+'\n[/ul]', re );
                        break;
                    case 'ol':
                        Util.drawLine( node, '[ol]\n'+sonString+'\n[/ol]', re );
                        break;
                    case 'br':
                        var block = node.findAncestorByTagName(['#line','li','ul','ol']);
                        if ( !node.isFirst( block ) && !node.isLast( block ) ) {
                            re.push('\n');
                            node.attr( '_showLastNewLine', true );
                        }
                        break;
                    default:
                        var s = '[';
                        s += node.tagName;
                        node.eachAttr(function( value, key ) {
                            if ( key.indexOf('_') !== 0 ) {
                                s += ' ';
                                s += key;
                                s += '=';
                                s += value;
                            }
                        });
                        s += ']';
                        s += node.value || '';
                        s += sonString;
                        s += '[/';
                        s += node.tagName;
                        s += ']';
                        if ( node.attr('_isBlock') ) {
                            Util.drawLine( node, s, re );
                        } else {
                            re.push( s );
                        }
                        break;
                }
                return re.join('');
            }
        },
        /**
         * 解析jquery object（树）为Node 对象
         * @param {object} $node jquery object
         * @param {object} currentNode 当前解析完成的节点(即父节点)
         * @param {object} setting 配置
         * @param {object} 解析完成的节点
         */
        parseHtml = function( $node, currentNode, setting ) {
            if ( $node.length !== 1 ) {
                throw 'ParseHtml: $node must only contains one element!';
            }
            var $children = $node.contents(),
                start = Util.parse$Node( $node, currentNode, setting ),    // 父节点添加此节点
                end,                                                       // 子节点添加的位置
                i = 0,
                l = $children.length,
                ii = 0,
                ll;
            // 不用解析的节点，则直接返回。例如注释,或者为空的字符串
            if ( start == null ) {
                return;
            }
            // 如果返回的是数组
            if ( start.length === 2 ) {
                end = start[1];
                start = start[0];
            } else {
                end = start;
            }

            // 添加上下文关系
            if ( currentNode ) {
                // 正常节点
                if ( start.tagName ) {
                    currentNode.append( start );
                // 没有tagName则此节点为空节点，则直接添加子节点
                } else {
                    end = currentNode;
                }
            }
            // 解析子节点
            for( i=0; i<l; i++ ) {
                parseHtml( $children.eq(i), end, setting );
            }
            return start;
        },
        rendUbb = function( node, setting ) {
            var re = [],
                i,
                l,
                children = node.children();
            for( i=0,l=children.length; i<l; i++ ) {
                re.push( rendUbb( children[i], setting ) );
            }
            return Util.rendUbbTag( node, re.join(''), setting );
        },
        /**
         * 解析ubb string为Node 对象
         * @param {string} ubb 
         * @param {object} currentNode 当前解析完成的节点(即父节点)
         * @param {object} setting 配置
         * @param {object} 解析完成的节点
         */
        parseUbb = function(ubb, currentNode, setting) {
            
        };

    /**
     *  var ubbParser = new UBB();
     *  @param {object} setting 设置
     */
    function UBB( setting ) {
        this.setting = $.extend( {
                            defaultColor: '#000000',
                            linkDefaultColor: '#006699',
                            keepWhiteSpace: true,
                            keepNewLine: false,
                            tags:{}
                        }, setting );
        /**
         * @param {object} $dom jquery对象节点
         * @return {string} ubb字符串
         */
        this.HTMLtoUBB = function ( $dom ) {
            var node = parseHtml($dom, null, this.setting);
            return rendUbb( node, this.setting );
        };
        /**
         * @param {string} ubb 字符串
         * @return {string} html字符串
         */
        this.UBBtoHTML = function( ubb ) {
        };
        /**
         * 新增一种tag
         * @param {string} name tag名字
         * @param {object} parsers 解析器与绘制器,例子：{
         *                                              parserNode:function() {},
         *                                              rendUBBTag: function( node, songString ) {},
         *                                              // TODD
         *                                          }
         */
        this.newTag = function( name, parsers ) {
            this.setting.tags[name] = parsers;
            return this;
        };
        /**
         * 设置过滤器，如果想要忽略一些html就使用过滤器
         * @param {function} nodeFilter 节点的过滤器，html转ubb时使用，返回false,0,null,undefined, 则不处理此节点和其子节点
         *                                                             返回node，则是修改此节点返回值，子节点依旧
         *                                                             返回true或非node，则是不修改此节点
         * @param {function} ubbFilter
         */
        this.filter = function( nodeFilter, ubbFilter ) {
            this.setting.filter = this.setting.filter || [];
            this.setting.filter.push({
                node: nodeFilter,
                ubb: ubbFilter
            });
            return this;
        };
        this.Node = Node;
    }
    UBB.Node = Node;
    return UBB;
});
