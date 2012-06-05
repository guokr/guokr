/**
 * UBB 工具模块，提供UBB与html的转换功能
 * @author mzhou
 * @version 1.1
 * @description 此模块修改自ubbEditor
 * @log  1.1 增加了tUBBTag方法，用于生存ubb格式的字符串
 *           修改了tUBB2XHTML方法: 增加[url]ww.guokr.com[/url]的情况
 * 2011/5/18 更新了tUBBTag方法，修复了一些bug
 *           更新了tUBB2XHTML方法，修改了[url href=wwww.gogole.com]google[/url]形式的ubb标签
 *                                 并且修改为\n转换成<br/>
 * 2011/8/25 添加color标签
 */
G.def( 'UBBUtils', function() {
    /*
     * 表示所有的UBB标签模板，如果是字符则{s}会被替换成用户选中内容，
     *                        如果是函数则会取其执行后的返回值，并且这个函数的参数是 v, s。v是用户输入，s是用户选中
     *  它会被tUBBTag方法调用！
     */
    var tagsTmpl = {
            bold: '[bold]{s}[/bold]',
            italic: '[italic]{s}[/italic]',
            video: '[video]{v}[/video]',
            image: '[image]{v}[/image]',
            /*
             * @param: v    用户输入值
             * @param：s    [可选] 用户选中的值
             */
            link: function( v, s ) {
                if ( v && s ) {
                    return '[url href=' + v + ']' + s + '[/url]';
                }
                else if ( v ) {
                    return '[url]' + v + '[/url]';
                }
            },
            ref: '[ref]{v}[/ref]'
        },
        htmlsTmpl = {
            video: '<img class="gui-ubb-flash" data-src="{v}" src="/skin/imgs/flash.png" width="480" height="400"/>',
            link: '<a href="{v}">{v}</a>',
            image: '<img src="{v}"/>',
            ref: '<div class="gui-ubb-ref">{v}</div>'
        },
        flashSet = {
            youku: { tmpl: 'http://player.youku.com/player.php/sid/{v}/v.swf', reg: /http:\/\/v\.youku\.com\/v_show\/id_([^\.]+)\.html/},
            tudou: { tmpl: 'http://www.tudou.com/v/{v}/v.swf', reg: /http:\/\/www\.tudou\.com\/programs\/view\/([^\/]+)\//},
            wuliu: { tmpl: 'http://player.56.com/v_{v}.swf', reg: /http:\/\/www\.56\.com\/[^\/]+\/v_([^\.]+)\.html/ },
            ku6: { tmpl: 'http://player.ku6.com/refer/{v}/v.swf', reg: /http:\/\/v\.ku6\.com\/show\/([^\.]+)\.html/},
            ku6list: { tmpl: 'http://player.ku6.com/refer/{v}/v.swf', reg: /http:\/\/v\.ku6\.com\/special\/show_([^\.]+)\.html/},
            qq: { tmpl:'http://cache.tv.qq.com/qqplayerout.swf?vid={v}', reg: /http:\/\/v\.qq\.com\/[^\/]+\/([^\.]+)\.html/ }
        },
        swfWhiteList = [
            'youku.com',
            'tudou.com',
            '56.com',
            'ku6.com',
            'sohu.com',
            'qq.com',       //
            'sina.com',     //新浪：http://you.video.sina.com.cn/api/sinawebApi/outplayrefer.php/vid=68223740_1270492934_aEi9HyI/DjLK+l1lHz2stqkP7KQNt6nki220v1umLA1dQ0/XM5Gfat8F4y7SANkEqDhAQpA9d/0h0x0/s.swf
            'netease.com',  //网易：http://img1.cache.netease.com/flvplayer081128/~false~0085_V7KN1LPFC~vimg1.ws.126.net/image/snapshot/2011/12/F/D/V7KN1LPFD~.swf
            '126.net',
            'qiyi.com'      //奇艺：http://player.video.qiyi.com/5af90c022d39434d8ab43d919cc4b2eb/0/173/20111219/00f2f2ecdf364b5c.swf-pid=23648-ptype=2-albumId=145502-tvId=152284
        ];

    /*
     * 1.1添加标签工厂
     * 用于将提供的模板、用户输入值、选择值生成最终结果
     * @param: tmpl     模板
     * @param: v        用户输入值
     * @param: s        用户选择值
     * @returns: {string} 输入结果
     */
    function buildTag( tmpl, v, s ) {
        if ( tmpl && G.isFun( tmpl ) ) {
            return tmpl( v, s );
        }
        else if ( tmpl ) {
            return tmpl.replace( /{v}/g, v )
                       .replace( /{s}/g, s);
        }
    }

    return {
        /*
         * 根据输入的数组替换
         * @param _strers     被替换值
         * @param _reary      替换数组公式 [ [正则表达式, 替换函数, false则是直接替换/true则是反复调用], [正则表达式, 替换函数, ], [正则表达式, 替换函数, ], ...... ]
         * @param _ign        如果是空值，被替换元素直接去掉
         */
        tReplace: function (_strers, _reary, _ign) {
            var tstrers = _strers,
                treary = _reary,
                tign = _ign,
                tstate1 = true;
            for (var ti = 0; ti < treary.length; ti++) {
                if (!treary[ti][2]) tstrers = tstrers.replace(treary[ti][0], (tign ? '' : treary[ti][1]));
            };
            while (tstate1) {
                tstate1 = false;
                for (var ti = 0; ti < treary.length; ti++) {
                    if (treary[ti][2] && tstrers.search(treary[ti][0]) != -1) {
                        tstate1 = true;
                        tstrers = tstrers.replace(treary[ti][0], (tign ? '' : treary[ti][1]));
                    };
                };
            };
            return tstrers;
        },
        /*
         * 颜色，RGB转换为Hex格式
         */
        tRGB2Hex: function (_strers) {
            var tstrers = _strers,
                tRGB2HexI = 0,
                tRGB2HexX = 255,
                tRGB2HexValue = '',
                tRegExp = /([0-9]+)[, ]+([0-9]+)[, ]+([0-9]+)/,
                tArray = tRegExp.exec(tstrers);
            if (!tArray) {
                tRGB2HexValue = tstrers;
            } else {
                for (ti = 1; ti < tArray.length; ti++) tRGB2HexValue += ('0' + parseInt(tArray[ti]).toString(16)).slice(-2);
                tRGB2HexValue = '#' + tRGB2HexValue;
            };
            return tRGB2HexValue;
        },
        /*
         * HTML代码编码
         */
        tHTMLEncode: function (_strers) {
            var tstrers = _strers;
            if (tstrers) {
                tstrers = tstrers.replace(/&/igm, '&amp;');
                tstrers = tstrers.replace(/</igm, '&lt;');
                tstrers = tstrers.replace(/>/igm, '&gt;');
                tstrers = tstrers.replace(/\"/igm, '&quot;');
                tstrers = tstrers.replace(/ /igm, '&nbsp;');
            };
            return tstrers;
        },
        /*
         * HTML代码解码
         */
        tHTMLDecode: function (_strers) {
            var tstrers = _strers;
            if (tstrers) {
                tstrers = tstrers.replace(/&lt;/igm, '<');
                tstrers = tstrers.replace(/&gt;/igm, '>');
                tstrers = tstrers.replace(/&quot;/igm, '"');
                tstrers = tstrers.replace(/&nbsp;/igm, ' ');
                tstrers = tstrers.replace(/&amp;/igm, '&');
            };
            return tstrers;
        },
        /*
         * 清理HTML中的潜在危险，跨站脚本等等
         */
        tHTMLClear: function (_strers) {
            var tstrers = _strers;
            if (tstrers) {
                tstrers = tstrers.replace(/<script[^>]*>[\s\S]*?<\/script[^>]*>/gim, '');
                tstrers = tstrers.replace(/<(\/?)(script|i?frame|style|html|head|body|title|link|meta|object|\?|\%)([^>]*?)>/gi, '');
                tstrers = tstrers.replace(/<([a-z]+)+\s*(?:onerror|onload|onunload|onresize|onblur|onchange|onclick|ondblclick|onfocus|onkeydown|onkeypress|onkeyup|onmousemove|onmousedown|onmouseout|onmouseover|onmouseup|onselect)[^>]*>/gi, '<$1>');
            };
            return tstrers;
        },
        /*
         * HTML转化为XHTML，结尾标签，格式化
         */
        tHTML2XHTML: function (_strers) {
            var tstrers = _strers;
            if (tstrers) {
                tstrers = tstrers.replace(/<br.*?>/ig, '<br />');
                tstrers = tstrers.replace(/(<hr\s+[^>]*[^\/])(>)/ig, '$1 />');
                tstrers = tstrers.replace(/(<img\s+[^>]*[^\/])(>)/ig, '$1 />');
            };
            return tstrers;
        },
        /*
         * Important: XTHML转UBB
         *        主要思路是替换掉可转换的标签，去除无用的标签，然后解码HTML（Code标签）
         */
        tXHTML2UBB: function (_strers) {
            var tstrers = _strers;
            if (tstrers) {
                var tthis = this;
                var tReplaceAry = [
                    [/\n/ig, '', false],
                    // [/<br \/>/ig, '[br]', false],
                    // [/<p>([^<]*?)<\/p>/igm, '[p]$1[/p]', true],
                    [/<blockquote>([\w\W]*?)<\/blockquote>/igm, '[blockquote]$1[/blockquote]', false],
                    [/<div class="?gui-ubb-ref"?>([\w\W]*?)<\/div>/igm, '[ref]$1[/ref]', false],   // 只转换一个
                    [/<br \/>/ig, '\n', false],
                    [/<\/div>(\n?<div>)?/igm, '\n', false],             // for chrome hack
                    [/([\w\W]+)<div>/igm, '$1\n', false],               // for chrome hack
                    [/<b>([\w\W]*?)<\/b>/igm, '[bold]$1[/bold]', true],
                    [/<strong>([\w\W]*?)<\/strong>/igm, '[bold]$1[/bold]', true],
                    [/<i>([\w\W]*?)<\/i>/igm, '[italic]$1[/italic]', true],
                    [/<em>([\w\W]*?)<\/em>/igm, '[italic]$1[/italic]', true],
                    // [/<u>([^<]*?)<\/u>/igm, '[underline]$1[/underline]', true],
                    [/<ol>([^<]*?)<\/ol>/igm, '[ol]\n$1[/ol]\n', true],
                    [/<ul>([^<]*?)<\/ul>/igm, '[ul]\n$1[/ul]\n', true],
                    [/<li>([^<]*?)<\/li>/igm, '$1\n', true],
                    [/<span\s[^>]*?>([\w\W]*?)<\/span>/igm, function ($0, $1) {
                        var tString = $1;
                        var tObj1 = $($0)[0];
                        if (tObj1.style.fontWeight.toLowerCase() == 'bold') tString = '[bold]' + tString + '[/bold]';
                        if (tObj1.style.fontStyle.toLowerCase() == 'italic') tString = '[italic]' + tString + '[/italic]';
                        if (tObj1.style.textDecoration.toLowerCase() == 'underline') tString = '[underline]' + tString + '[/underline]';
                        if (tObj1.style.color) {
                            tString = '[color=' + tthis.tRGB2Hex(tObj1.style.color) + ']' + tString + '[/color]';
                        }
                        // if (tObj1.style.backgroundColor) tString = '[hilitecolor=' + tthis.tRGB2Hex(tObj1.style.backgroundColor) + ']' + tString + '[/hilitecolor]';
                        tObj1 = null;
                        return tString;
                    },
                    true],
                    // [/<font\s[^>]*?>([^<]*?)<\/font>/igm, function ($0, $1) {
                        // var tString = $1;
                        // var tObj1 = $($0)[0];
                        // if (tObj1.getAttribute('color')) tString = '[color=' + tthis.tRGB2Hex(tObj1.getAttribute('color')) + ']' + tString + '[/color]';
                        // if (tObj1.style.color) tString = '[color=' + tthis.tRGB2Hex(tObj1.style.color) + ']' + tString + '[/color]';
                        // if (tObj1.style.backgroundColor) tString = '[hilitecolor=' + tthis.tRGB2Hex(tObj1.style.backgroundColor) + ']' + tString + '[/hilitecolor]';
                        // return tString;
                    // },
                    // true],
                    [/<p\s[^>]*?>([\w\W]*?)<\/p>/igm, function ($0, $1) {
                        var tString = $1;
                        var tObj1 = $($0)[0];
                        if (tObj1.style.fontWeight.toLowerCase() == 'bold') tString = '[p][bold]' + tString + '[/bold][/p]';
                        // if (tObj1.getAttribute('color')) tString = '[p][color=' + tthis.tRGB2Hex(tObj1.getAttribute('color')) + ']' + tString + '[/color][/p]';
                        // if (tObj1.style.color) tString = '[p][color=' + tthis.tRGB2Hex(tObj1.style.color) + ']' + tString + '[/color][/p]';
                        // if (tObj1.style.backgroundColor) tString = '[p][hilitecolor=' + tthis.tRGB2Hex(tObj1.style.backgroundColor) + ']' + tString + '[/hilitecolor][/p]';
                        // if (tObj1.getAttribute('align')) tString = '[align=' + tObj1.getAttribute('align') + ']' + tString + '[/align]';
                        // if (tObj1.style.textAlign) tString = '[align=' + tObj1.style.textAlign + ']' + tString + '[/align]';
                        tObj1 = null;
                        return tString;
                    },
                    true],
                    // [/<div\s[^>]*?>([^<]*?)<\/div>/igm, function ($0, $1) {
                        // var tString = $1;
                        // var tObj1 = $($0)[0];
                        // if (tObj1.className == 'ubb_code') tString = '[code]' + tString + '[/code]';
                        // if (tObj1.className == 'ubb_quote') tString = '[quote]' + tString + '[/quote]';
                        // if (tObj1.getAttribute('align')) tString = '[align=' + tObj1.getAttribute('align') + ']' + tString + '[/align]';
                        // if (tObj1.style.textAlign) tString = '[align=' + tObj1.style.textAlign + ']' + tString + '[/align]';
                        // tObj1 = null;
                        // return tString;
                    // },
                    // true],
                    // [/<embed\s[^>]*?>/igm, function( $0 ) {
                        // var tObj1 = $($0)[0],
                        //     tString = tObj1.getAttribute('src');
                        // if (tString) tString = '[flash]' + tString + '[/flash]';
                        // tObj1 = null;
                        // return tString;
                    // },
                    // true],
                    [/<a\s[^>]*?>([^<]*?)<\/a>/igm, function ($0, $1) {
                        var tString = $1;
                        var tObj1 = $($0)[0];
                        if (tObj1.getAttribute('href')) tString = '[url href=' + tObj1.getAttribute('href') + ']' + tString + '[/url]';
                        tObj1 = null;
                        return tString;
                    },
                    true],
                    [/<img\s[^>]*?>/igm, function ($0) {
                        var tObj1 = $($0)[0],
                            tString = tObj1.getAttribute('src'),
                            dataSrc = tObj1.getAttribute('data-src');
                        if (dataSrc) {
                            tString = '[video]' + dataSrc + '[/video]';
                            return tString;
                        }
                        if (tString) tString = '[image]' + tString + '[/image]';
                        tObj1 = null;
                        return tString;
                    },
                    true]
                    // [/\]\[br\]\[/igm, '] [', true],
                    // [/\[br\]\[\/p\]/igm, '[/p]', true],
                    // [/\[\/p\]\[p\]/igm, '[/p]\r\n[p]', true]
                ];
                tstrers = this.tReplace(tstrers, tReplaceAry);
                tstrers = tstrers.replace(/<[^>]*>/igm, '');
                tstrers = this.tHTMLDecode(tstrers);
            };
            return tstrers;
        },
        /*
         * UBB转XHTML
         *        先编码(Code)后替换，UBB是可控的，所以没有意料之外的标签。
         *        1.1 增加[url]ww.guokr.com[/url]的情况
         */
        tUBB2XHTML: function (_strers) {
            var tstrers = _strers;
            if (tstrers) {
                var tthis = this;
                var tReplaceAry = [
                    // [/\[br\]/igm, '<br />', false],
                    // [/\[p\]([^\[]*?)\[\/p\]/igm, '<p>$1</p>', true],
                    // [/\[b\]([^\[]*?)\[\/b\]/igm, '<b>$1</b>', true],
                    // [/\[i\]([^\[]*?)\[\/i\]/igm, '<i>$1</i>', true],
                    // [/\[u\]([^\[]*?)\[\/u\]/igm, '<u>$1</u>', true],
                    // [/\[ol\]([^\[]*?)\[\/ol\]/igm, '<ol>$1</ol>', true],
                    // [/\[ul\]([^\[]*?)\[\/ul\]/igm, '<ul>$1</ul>', true],
                    // [/\[li\]([^\[]*?)\[\/li\]/igm, '<li>$1</li>', true],
                    // [/\[code\]([^\[]*?)\[\/code\]/igm, '<div class="ubb_code" style="BORDER: #dcdcdc 1px dotted; PADDING: 5px; LINE-HEIGHT: 150%; FONT-STYLE: italic">$1</div>', true],
                    // [/\[quote\]([^\[]*?)\[\/quote\]/igm, '<div class="ubb_quote" style="BORDER: #dcdcdc 1px dotted; PADDING: 5px; LINE-HEIGHT: 150%">$1</div>', true],
                    // [/\[hilitecolor=([^\]]*)\]([^\[]*?)\[\/hilitecolor\]/igm, '<font style="background-color: $1">$2</font>', true],
                    // [/\[align=([^\]]*)\]([^\[]*?)\[\/align\]/igm, '<p align="$1">$2</p>', true],
                    [/\[ul\]\n?([\w\W]*?)\n?\[\/ul\]\n?/igm, function ($0, $1) {
                        return '<ul><li>' + $1.split('\n').join('</li><li>') + '</li></ul>';
                    },
                    false],
                    [/\[ol\]\n?([\w\W]*?)\n?\[\/ol\]\n?/igm, function ($0, $1) {
                        return '<ol><li>' + $1.split('\n').join('</li><li>') + '</li></ol>';
                    },
                    false],
                    [/\n/igm, '<br />', false],
                    [/\[color=([^\]]*)\]([^\[]*?)\[\/color\]/igm, function( $0, $1, $2 ) {
                        return '<span style="color: '+$1.replace(/&nbsp;/g,'')+'">'+$2+'</span>'; // 浏览器不支持rgb(128,&nbsp;128,&nbsp;128),&nbsp是过滤时候带上的
                    }, true],
                    [/\[url\&nbsp\;href=([^\]]*)\]([\w\W]*?)\[\/url\]/igm, '<a href="$1">$2</a>', false],
                    [/\[url\]([^\]]*?)\[\/url\]/igm, '<a href="$1">$1</a>', true],
                    [/\[image\]([^\[]*?)\[\/image\]/igm, '<img src="$1"/>', true],
                    [/\[video\]([^\[]*?)\[\/video\]/igm, '<img class="gui-ubb-flash" data-src="$1" src="/skin/imgs/flash.png" width="480" height="400"/>', true],
                    [/\[bold\]([\w\W]*?)\[\/bold\]/igm, '<b>$1</b>', false],
                    [/\[italic\]([\w\W]*?)\[\/italic\]/igm, '<i>$1</i>', false],
                    [/\[blockquote\]([\w\W]*?)\[\/blockquote\]/igm, '<blockquote>$1</blockquote>', false],
                    [/\[ref\]([\w\W]*?)\[\/ref\]/igm, '<div class="gui-ubb-ref">$1</div>', false]
                ];
                tstrers = this.tHTMLEncode(tstrers);
                tstrers = this.tReplace(tstrers, tReplaceAry);
                // 替换掉未能够转换的多余标签，可能是由于用户误输入导致
                tstrers = this.tReplace( tstrers, [
                    [/\[\/?(bold|italic|url|video|image|color|ul|ol)[^\]]*?\]/igm, '', false ]
                ], true );
            };
            return tstrers;
        },
        /*
         * 1.1 增加此方法
         * 生成UBBtag
         * @param: tagName
         * @param: v    用户输入值
         * @param：s    [可选] 用户选中的值
         * return 生成后的UBBtag,用于插入
         */
        tUBBTag: function( tagName, v, s ) {
            return buildTag( tagsTmpl[ tagName ], v, s );
        },
        /*
         * 1.1 增加方法
         * 生成html标签
         * @param: tagName  标签
         * @param: v        用户输入值
         * @param: s        用户选中值
         */
        tHTMLTag: function( tagName, v, s ) {
            return buildTag( htmlsTmpl[ tagName ], v, s );
        },
        /**
         * 验证flash地址是否是youku/tudou/56/ku6的视频
         * @param {string} url 页面地址
         * @return {boolean} 成功与否
         */
        tValidateFlash: function( url ) {
            if ( ~url.indexOf('.swf') ) {
                for ( var i=0,l=swfWhiteList.length; i<l; i++ ) {
                    if ( ~url.indexOf( swfWhiteList[i] ) ) {
                        return true;
                    }
                }
            }
            var value,
                result;
            for ( var key in flashSet ) {
                if ( flashSet.hasOwnProperty( key ) ) {
                    value = flashSet[ key ];
                    result = value.reg.exec( url );
                    if ( result ) {
                        return true;
                    }
                }
            }
            return false;
        },
        /**
         * 验证ref的地址是否正确
         * @param {string} url 页面地址
         * @return {boolean} 成功与否
         */
        tValidateRef: function( url ) {
            return /(http:\/\/)?www\.guokr\.com\/(post|article|blog|question|zone\/[^\/]+\/article)\/\d+(\/)?/.test( url );
        },
        /**
         * 修改页面的url地址为flash地址
         * @param {string} url 页面地址
         * @return {string} 转换后的flash地址，如果没有则返回空字符串
         */
         urlToFlash: function( url ) {
            var value,
                result;
            for ( var key in flashSet ) {
                if ( flashSet.hasOwnProperty( key ) ) {
                    value = flashSet[ key ];
                    result = value.reg.exec( url );
                    if ( result && result[1] ) {
                        return G.format( value.tmpl, result[1] );
                    }
                }
            }
            return '';
        }
    };
});


