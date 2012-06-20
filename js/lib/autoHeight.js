/**
 * autoHeight
 * @author mzhou
 * @log 0.1
 */

/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr    :true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "Event.js";

G.def('autoHeight', ['Event'], function(Event) {
    'use strict';
    function AutoHeight(selector, option) {
        var self = this,
            $obj = $(selector),
            obj = $obj[0],
            nodeName = obj && obj.nodeName.toLowerCase(),
            timer,
            $iframe;

        if (nodeName === 'iframe') {
            $iframe = $obj;
            var win = obj.contentWindow || obj.contentDocument && obj.contentDocument.defaultView,
                doc = win.document,
                oldHtml = $(doc.body).html();
            if (doc.designMode !== 'on') {
                doc.designMode = 'on';
                // must do this or doc.body is null
                doc.open();
                doc.writeln(oldHtml);
                doc.close();
            }

            $obj = $('body', doc);
            // if no children
            if ($obj.children().length === 0) {
                $('<br/>', doc).appendTo($obj);
                // throw error on IE6
            }
            self.doc = doc;
            self._isIFrame = true;
        } else if (nodeName !== 'textarea') {
            return this;
        }

        self.$obj = $obj;
        self.$iframe = $iframe;

        var opt = {
                blankHeight: 0,
                // maxHeight: 
                minHeight: self._isIFrame ?  $iframe.height() : $obj.height()
            };
        self.oldHeight = opt.minHeight;
        $.extend(opt, option);
        self.maxHeight = opt.maxHeight;
        self.minHeight = opt.minHeight;
        self.blankHeight = opt.blankHeight;

        function adjustHeight() {
            self.adjustHeight();
        }
        adjustHeight();
        $obj.bind('paste.gkAutoHeight cut.gkAutoHeight mouseup.gkAutoHeight keyup.gkAutoHeight dragover.gkAutoHeight drop.gkAutoHeight', function() {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(adjustHeight, 50);
        });
    }
    Event.extend(AutoHeight);

    AutoHeight.prototype.adjustHeight = function() {
        var parent,
            newHeight,
            backupStyleNames,
            self = this,
            $obj = self.$obj;

        if (self._isIFrame) {
            // iframe
            if (!self.$marker) {
                if (!self._inited) {
                    backupStyleNames = ['word-wrap', 'overflow-x'];
                    self.backupStyle = {};
                    G.each(backupStyleNames, function(v) {
                        self.backupStyle[v] = $obj.css(v);
                    });
                    $obj.css('word-wrap', 'break-word');
                    $obj.css('overflow-x', 'hidden');
                    self._inited = true;
                }
                self.$marker = $('<span style="width:0;display:block;font-size:0;height:0;line-height:0;">&nbsp;</span>', self.doc).appendTo($obj);
            } else {
                parent = self.$marker.parent();
                if (!parent[0] || parent[0].nodeName.toLowerCase() !== 'body') {
                    self.$marker.remove();
                    self.$marker = $('<span style="width:0;display:block;font-size:0;height:0;line-height:0;">&nbsp;</span>', self.doc).appendTo($obj);
                }
            }
            var pos = self.$marker.position();
            if (pos) {
                self.contentHeight = self.$marker.position().top;
            } else {
                return self;
            }
        } else {
            // textarea
            var text;
            if (!self.$marker) {
                if (!self._inited) {
                    backupStyleNames = ['resize', 'overflow', 'overflow-x'];
                    self.backupStyle = {};
                    G.each(backupStyleNames, function(v) {
                        self.backupStyle[v] = $obj.css(v);
                    });
                    $obj.css('resize', 'none');
                    $obj.css('overflow', 'hidden');
                }
                self.$marker = $('<div style="position:absolute;top:0;left:-9999px;white-space:pre-wrap;word-wrap:break-word;padding:0;margin:0;border:1px solid #CCC;"></div>').appendTo('body');
                self.$marker.css({
                    fontSize: $obj.css('font-size'),
                    fontFamily: $obj.css('font-family'),
                    lineHeight: $obj.css('line-height'),
                    // if textarea not set width then normal way calculate width will be error
                    width: $obj.width()
                });
                if (!self._inited) {
                    $obj.css('overflow', 'auto');
                    $obj.css('overflow-x', 'hidden');
                    self._inited = true;
                }
            }

            text = $obj.val();
            if (text.lastIndexOf('\n') === (text.length - 1)) {
                text = text+'@';
            }
            text = text.replace(/\n/g, '<br/>');
            self.$marker.html(text);
            self.contentHeight = self.$marker.height();
        }

        var $adjusted = self._isIFrame ? self.$iframe : $obj;
        if (self.contentHeight > self.minHeight) {
            if (self.maxHeight && self.contentHeight > self.maxHeight) {
                newHeight = self.maxHeight;
                $obj.css('overflow', 'scroll');
            } else {
                newHeight = self.contentHeight;
                $obj.css('overflow', 'hidden');
            }
            $adjusted.height(newHeight + self.blankHeight);
            self.fire('heightChange', newHeight);
        } else {
            $adjusted.height(self.minHeight+self.blankHeight);
            $obj.css('overflow', 'hidden');
            self.fire('heightChange', self.minHeight);
        }
        return self;
    };

    AutoHeight.prototype.destroy = function() {
        var self = this;
        if (self.marker && self.marker.length) {
            self.marker.remove();
        }
        if (self.backupStyle) {
            G.each(self.backupStyle, function(v, k) {
                self.$obj.css(k, v);
            });
        }
        self.$obj.unbind('.gkAutoHeight');

        (self._isIFrame ? self.$iframe : self.$obj).height(self.oldHeight);
        return self;
    };

    return function(sel, opt) {
        return new AutoHeight(sel, opt);
    };
});
