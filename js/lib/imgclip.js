G.def('imgclip', function () {
    return (function() {
        function ImageClipping( headSelector, previewSelectors, option) {
            var imgMask,        // image mask
                coverMask,      // font cover of mask (jQuery Object)
                resizerMask,    // resizer
                xResize,
                yResize,
                oldWidth,       // width of headImage
                oldHeight,      // height of headImage
                backImage,      // background of image to show
                previewers,// the array of all the previewers(jQuery Object)
                top,    // x point
                left,   // y point
                width,          // width of clip
                height,         // height of clip
                tempX,          // old X of clip
                tempY,          // old Y of clip
                isMouseDown,    // mouse down flag
                isXResize,
                isYResize,
                isMove,         // move flag, if not move it will be resize
                headImage,      // head image(temp used)
                maskWrapper,    // mask wrapper(temp used)
                preview,        // preview img(temp used)
                minWidth,
                minHeight;
            /**
             * mousedown to trigger the move/resize,bind to imgMask
             * @param {object} event object
             * @return null
             */ 
            function mousedown( event ) {
                event.preventDefault(); //阻止默认的拖拽
                isMouseDown = true;
                isXResize = event.target.className.indexOf("xResize") === 0;
                isYResize = event.target.className.indexOf("yResize") === 0;
                isMove = (event.target.id !== "resizerMask") && !isXResize && !isYResize;
                tempX = event.pageX;
                tempY = event.pageY;
                if ( isMove ) {
                    coverMask.css("cursor","move");
                }
                else if( isXResize ) {
                    coverMask.css("cursor","e-resize");
                    imgMask.css("cursor","e-resize");
                }
                else if( isYResize ) {
                    coverMask.css("cursor","n-resize");
                    imgMask.css("cursor","n-resize");
                }
                else {
                    coverMask.css("cursor","se-resize");
                    imgMask.css("cursor","se-resize");
                }
            }
            
            /**
             * mouseup event handler,bind to imgMask
             * @param {object} event object
             * @return null
             */ 
            function mouseup( event ) {
                isMouseDown = isMove = isXResize = isYResize = false;
                coverMask.css("cursor","default");
                imgMask.css("cursor","default");
            }
            
            /**
             * mousemove event handler,bind to imgMask
             * @param {object} event object
             * @return null
             */ 
            function mousemove( event ) {
                event.preventDefault();
                if ( isMouseDown ) {
                    var $elem = $(this),
                        _top = top,
                        _left = left,
                        _width = width,
                        _height = height,
                        _y_c = event.pageY - tempY,
                        _x_c = event.pageX - tempX,
                        _c = Math.abs(_y_c) < Math.abs(_x_c) ? _y_c : _x_c;
                    // move
                    if ( isMove ) {
                        _top += _y_c;
                        _left += _x_c;
                    }
                    else if ( isXResize ) {
                        _width += _x_c;
                        _height += _x_c;
                    }               
                    else if ( isYResize ) {
                        _width += _y_c;
                        _height += _y_c;
                    }
                    // resize
                    else {
                        _width += _x_c;
                        _height += _x_c;
                    }
                    // not out head image box
                    if ( _left >= 0 && oldWidth >= (_left + _width) && _top >= 0 && oldHeight >= (_top + _height) && _width > minWidth && _height > minHeight) {
                        left = _left;
                        width = _width;
                        top = _top;
                        height = _height;
                    }
                    tempX = event.pageX;
                    tempY = event.pageY;
                    update();
                }
            }
            
            /**
             * update the coverMask,previewers
             * @return null
             */
            function update() {
                coverMask.css({
                    width:width,
                    height:height,
                    top: top,
                    left: left
                });
                width = coverMask.width();
                height = coverMask.height();
                backImage.css({
                    top:-top,
                    left:-left
                });
                for ( var i=0,l=previewers.length; i<l; i++ ) {
                    updatePreview( previewers[i]);
                }
            }   
            
            /**
             * update the previewers
             * @return null
             */     
            function updatePreview( preview ) {
                var wh = preview.data( "guoke_wh" );
                preview.css({
                    width: wh[0]*oldWidth/width,
                    height: wh[1]*oldHeight/height,
                    "margin-top": -(wh[0]*top/width),
                    "margin-left": -(wh[1]*left/height)
                });
            }
            

            //初始化coverask，resizerask，previewers
            previewers = [];
            headImage = typeof headSelector === "string" ? $(headSelector) : headSelector;
            oldWidth = headImage.width();
            oldHeight = headImage.height();
            width = option && option.width || Math.min( oldWidth, oldHeight );
            height = option && option.height || width;
            top = option && option.top || 0;
            left = option && option.left || 0;
            minHeight = option && option.minHeight || 48;
            minWidth = option && option.minWidth || 48;
            
            maskWrapper = headImage.wrap("<div class='mask_wrapper'></div>").css({opacity:0.6}).parent().bind("drag",function(e){e.preventDefault();});
            var html = [maskWrapper.html(),
                            "<div id='imgMask' class='img_mask'><div id='coverMask' class='cover_mask' style='top:",
                            top,
                            "px;left:",
                            left,
                            "px;width:",
                            width,
                            "px;height:",
                            height,
                            "px;overflow:hidden;'><img style='position:absolute;top:",
                            -top,
                            "px;left:",
                            -left,
                            "px;width:",
                            oldWidth,
                            "px;height:",
                            oldHeight,
                            "px;' src='",
                            headImage.attr("src"),
                            "'/><div class=' top_border'></div><div class=' left_border'></div><div class='xResize right_border'></div><div class='yResize bottom_border'></div><div id='resizerMask' class='resizer_mask'></div></div></div>"].join("");
            maskWrapper.html( html );
            imgMask = $("#imgMask").css( {width:oldWidth,height:oldHeight} )
                                   .mousedown( mousedown );
            $("body").mousemove( mousemove )
                     .mouseup( mouseup )
                     .mouseleave( mouseup );
            coverMask = imgMask.children( "#coverMask" );
            resizerMask = imgMask.children( "#resizerMask" );
            backImage = imgMask.find( "img" );
            yResize = imgMask.find( ".yResize" );
            xResize = imgMask.find( ".xResize" );
            for ( var selector in previewSelectors ) {
                preview = headImage.clone()
                                    .css({opacity:1})
                                    .data( "guoke_wh", previewSelectors[selector] );
                previewers.push(preview);
                $(selector).append(preview).css({
                    width:previewSelectors[selector][0],
                    height:previewSelectors[selector][1]
                });
                updatePreview(preview);
            }
            
            return {update:update};
        }

        return function( $this, previews, option ) {
            if ( $this.length === 1 ) {
                $this.imageClipper = ImageClipping( $this, previews, option );
            }
        };
    }());
});
