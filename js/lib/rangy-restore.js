/**
 * @license Selection save and restore module for Rangy.
 * Saves and restores user selections using marker invisible elements in the DOM.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * http://code.google.com/p/rangy/
 *
 * Depends on Rangy core.
 *
 * Copyright 2011, Tim Down
 * Licensed under the MIT license.
 * Version: 1.2.1
 * Build date: 8 October 2011
 */
//@import "rangy.js";
G.def( 'rangy-restore', ['rangy'], function( rangy ) {
    rangy.createModule("SaveRestore", function(api, module) {
        api.requireModules( ["DomUtil", "DomRange", "WrappedRange"] );

        var dom = api.dom;

        var markerTextChar = "\ufeff";

        function gEBI(id, doc) {
            return (doc || document).getElementById(id);
        }

        /**
         * 插入标志位,标志位为:<span id="selectionBoundary_35454">\ufeff</span>
         * @param {object} range range对象
         * @param {boolean} atStart 是否是在开始位置插入，如果不是则在结束位置
         * @return {object} markerEl 返回标志位的dom对象
         */
        function insertRangeBoundaryMarker(range, atStart, isShow) {
            var markerId = "selectionBoundary_" + (+new Date()) + "_" + ("" + Math.random()).slice(2);
            var markerEl;
            var doc = dom.getDocument(range.startContainer);

            // Clone the Range and collapse to the appropriate boundary point
            var boundaryRange = range.cloneRange();
            boundaryRange.collapse(atStart);

            // Create the marker element containing a single invisible character using DOM methods and insert it
            markerEl = doc.createElement("span");
            markerEl.id = markerId;
            //markerEl.style.lineHeight = "0";
            if ( !isShow ) {
                markerEl.style.display = "none";
            }
            markerEl.className = "rangySelectionBoundary";
            markerEl.appendChild(doc.createTextNode(markerTextChar));

            boundaryRange.insertNode(markerEl);
            boundaryRange.detach();
            return markerEl;
        }

        /**
         * 设置range的位置为标志位位置
         * @param {object} doc document
         * @param {object} range range对象
         * @param {string} markerId 标记的id
         * @param {boolean} atStart 开始位置
         */
        function setRangeBoundary(doc, range, markerId, atStart) {
            var markerEl = gEBI(markerId, doc);
            if (markerEl) {
                range[atStart ? "setStartBefore" : "setEndBefore"](markerEl);
                markerEl.parentNode.removeChild(markerEl);
            } else {
                module.warn("Marker element has been removed. Cannot restore selection.");
            }
        }
        
        /**
         * 比较两个range的开始位置, r1与r2比较
         * @param {object} r1 range1
         * @param {object} r2 range2
         * @return {number} -1表示r1的开始位置在r2的开始位置前面，0表示r1与r2的开始位置重合，1表示r1的开始位置在r2的开始位置后面
         */
        function compareRanges(r1, r2) {
            return r2.compareBoundaryPoints(r1.START_TO_START, r1);
        }

        /**
         * 获取光标相对于document的绝对坐标
         * @param {object} win window
         * @return {object} position 坐标
         */
        function getCaretPosition(win) {
            win = win || window;
            var doc = win.document;
            if (!api.isSelectionValid(win)) {
                module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
                return;
            }
            var sel = api.getSelection(win);
            var range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

            if ( range && range.collapsed ) {
                var el = insertRangeBoundaryMarker(range, false, true),
                    pos = $(el).show().offset();
                el.parentNode.removeChild(el);
                return pos;
            } else {
                return null;
            }
        }

        /**
         * 保存选中区域
         * @param {object} win window
         * @return {object}
         */
        function saveSelection(win) {
            win = win || window;
            var doc = win.document;
            if (!api.isSelectionValid(win)) {
                module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
                return;
            }
            var sel = api.getSelection(win);
            var ranges = sel.getAllRanges();
            var rangeInfos = [], startEl, endEl, range;

            // Order the ranges by position within the DOM, latest first
            ranges.sort(compareRanges);

            for (var i = 0, len = ranges.length; i < len; ++i) {
                range = ranges[i];
                if (range.collapsed) {
                    endEl = insertRangeBoundaryMarker(range, false);
                    rangeInfos.push({
                        markerId: endEl.id,
                        collapsed: true
                    });
                } else {
                    endEl = insertRangeBoundaryMarker(range, false);
                    startEl = insertRangeBoundaryMarker(range, true);

                    rangeInfos[i] = {
                        startMarkerId: startEl.id,
                        endMarkerId: endEl.id,
                        collapsed: false,
                        backwards: ranges.length == 1 && sel.isBackwards()
                    };
                }
            }

            // Now that all the markers are in place and DOM manipulation over, adjust each range's boundaries to lie
            // between its markers
            for (i = len - 1; i >= 0; --i) {
                range = ranges[i];
                if (range.collapsed) {
                    range.collapseBefore(gEBI(rangeInfos[i].markerId, doc));
                } else {
                    range.setEndBefore(gEBI(rangeInfos[i].endMarkerId, doc));
                    range.setStartAfter(gEBI(rangeInfos[i].startMarkerId, doc));
                }
            }

            // Ensure current selection is unaffected
            sel.setRanges(ranges);
            return {
                win: win,
                doc: doc,
                rangeInfos: rangeInfos,
                restored: false
            };
        }

        /**
         * 恢复之前保存的选中
         * @param {object} savedSelection 选中的对象，由saveSelection获取
         * @param {boolean} preserveDirection 是否恢复选中的方向
         */
        function restoreSelection(savedSelection, preserveDirection) {
            if (!savedSelection.restored) {
                var rangeInfos = savedSelection.rangeInfos;
                var sel = api.getSelection(savedSelection.win);
                var ranges = [];

                // Ranges are in reverse order of appearance in the DOM. We want to restore earliest first to avoid
                // normalization affecting previously restored ranges.
                for (var len = rangeInfos.length, i = len - 1, rangeInfo, range; i >= 0; --i) {
                    rangeInfo = rangeInfos[i];
                    range = api.createRange(savedSelection.doc);
                    if (rangeInfo.collapsed) {
                        var markerEl = gEBI(rangeInfo.markerId, savedSelection.doc);
                        if (markerEl) {
                            markerEl.style.display = "inline";
                            var previousNode = markerEl.previousSibling;

                            // Workaround for issue 17
                            if (previousNode && previousNode.nodeType == 3) {
                                range.collapseToPoint(previousNode, previousNode.length);
                                markerEl.parentNode.removeChild(markerEl);
                            } else {
                                range.collapseBefore(markerEl);
                                markerEl.parentNode.removeChild(markerEl);
                            }
                        } else {
                            module.warn("Marker element has been removed. Cannot restore selection.");
                        }
                    } else {
                        setRangeBoundary(savedSelection.doc, range, rangeInfo.startMarkerId, true);
                        setRangeBoundary(savedSelection.doc, range, rangeInfo.endMarkerId, false);
                    }

                    // Normalizing range boundaries is only viable if the selection contains only one range. For example,
                    // if the selection contained two ranges that were both contained within the same single text node,
                    // both would alter the same text node when restoring and break the other range.
                    if (len == 1) {
                        range.normalizeBoundaries();
                    }
                    ranges[i] = range;
                }
                if (len == 1 && preserveDirection && api.features.selectionHasExtend && rangeInfos[0].backwards) {
                    sel.removeAllRanges();
                    sel.addRange(ranges[0], true);
                } else {
                    sel.setRanges(ranges);
                }

                savedSelection.restored = true;
            }
        }

        /**
         * 移除标记元素
         * @param {object} doc document
         * @param {string} markerId 标记的id
         */
        function removeMarkerElement(doc, markerId) {
            var markerEl = gEBI(markerId, doc);
            if (markerEl) {
                markerEl.parentNode.removeChild(markerEl);
            }
        }

        /**
         * 移除标记
         * @param {object} savedSelection 选中的对象，由saveSelection获取
         */
        function removeMarkers(savedSelection) {
            var rangeInfos = savedSelection.rangeInfos;
            for (var i = 0, len = rangeInfos.length, rangeInfo; i < len; ++i) {
                rangeInfo = rangeInfos[i];
                if (rangeInfo.collapsed) {
                    removeMarkerElement(savedSelection.doc, rangeInfo.markerId);
                } else {
                    removeMarkerElement(savedSelection.doc, rangeInfo.startMarkerId);
                    removeMarkerElement(savedSelection.doc, rangeInfo.endMarkerId);
                }
            }
        }

        api.saveSelection = saveSelection;
        api.restoreSelection = restoreSelection;
        api.removeMarkerElement = removeMarkerElement;
        api.removeMarkers = removeMarkers;
        api.getCaretPosition = getCaretPosition;
    });

    return rangy;
});
