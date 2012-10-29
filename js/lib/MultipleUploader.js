/**
 *  用于多文件上传的组件
 *  对于支持multiple属性的浏览器一次选择多份文件
 *  HTML由三部分组成
 *     上传input框 buttonTmpl
 *     拖动上传框 dragTmpl
 *     文件列表框 viewTmpl + fileViewTmpl
 *
 *  返回数据必须是json格式
 *      正确格式：{}
 *      错误格式：{error: 1, msg: '提示信息'}
 *  事件：
 *      addTooManyFiles 添加了超过限制的文件，参数(input/file, count)
 *      abort           强制停止上传，参数(id)
 *      timeout         上传超时，参数(id)
 *      waiting         等待上传中，参数(id)
 *      uploading       正在提交，参数(id)
 *      stateChange     上传状态改变，参数(id, state)
 *      success         上传成功，参数(id, data)
 *      error           上传失败，参数(id, data)
 *      progress        提交过程，参数(id, loaded, total)
 *
 *  CSS HOOK:
 *      文件列表(前缀参数stateClassPrefix)
 *          .gui-multiple-error
 *          .gui-multiple-timeout
 *          .gui-multiple-abort
 *          .gui-multiple-success
 *          .gui-multiple-uploading
 *          .gui-multiple-waiting
 *      拖动框(前缀参数dragStateClassPrefix)
 *          .gui-multiple-drag-enter
 *
 *  API:
 *      Statics method:
 *          Uploader.isSupported();
 *          Uploader.supportDrag();
 *          Uploader.supportXhr();
 *          Uploader.pushIfNotExist(array, v);
 *          Uploader.removeIfExist(array, v);
 *      normal method:
 *          uploader.remove();
 *          uploader.getFileView(id);
 *          uploader.getUpload(id);
 *          uploader.abort(id);
 *          uploader.getFileName(id);
 *          uploader.upload(id);
 *
 *  @author mzhou
 *  @log 0.1 init
 */


/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

//@import "./Event.js";
//
G.def('MultipleUploader', ['Event'], function(Event) {
    'use strict';
    var defaultOption = {
            buttonTmpl: '<input type="file" name="{v}" size="10"/>',
            viewTmpl: '<ul></ul>',
            fileViewTmpl: '<li data-id="{id}">{filename}</li>',
            dragTmpl: '<div class="gui-multiple-drag-area">将文件拖到此处上传</div>',
            // dragSelector: '#draggable',
            name: 'fileUploader',
            uploadOnChange: false,
            maxCount: 10,
            maxConnection: 2,
            defaultFailMsg: '上传失败',
            stateClassPrefix: 'gui-multiple-',
            dragStateClassPrefix: 'gui-multiple-drag',
            timeout: 10000,
            forceUseForm: false
        },
        uniqueId = 0;

    function Uploader(container, url, option) {
        var self = this;
        // input container dom
        self.$container = $(container);
        // upload url
        self.uploadUrl = url;
        // option
        self._option = $.extend({}, defaultOption, option);
        // upload name
        self.uploadName = self._option.name;
        // upload data, 不支持复杂的数据，比如数组
        self._params = self._option.params || {};
        // max uploaded file number
        self.maxCount = self._option.maxCount;
        // max connection number
        self.maxConnection = self._option.maxConnection;
        // number of selected file
        self.count = 0;

        // 以下属性在提交结束后会被清理
        self._abortFunc = {};
        self._connections = [];
        self._waiting = [];
        self._queue = [];

        // 以下属性会被保留，除非removeUpload
        self._fileViews = {};
        self._uploads = {};  // files or input doms

        // init
        self._init();

        // upload waiting file after success
        self.on('complete', function(id, state) {
            if (state = self.constructor.state.SUCCESS) {
                var firstWaitingId = self._waiting[self._waiting.length-1];
                // upload waitings
                if (firstWaitingId) {
                    self.upload(firstWaitingId);
                }
            }
        });
        // setup fileViews state
        self.on('stateChange', function(id, state) {
            self.constructor.setStateClass(self.getFileView(id), state, self._option.stateClassPrefix);
        });
    }
    Event.extend(Uploader);

    /**
     * 请求的状态
     */
    Uploader.state = {
        SUCCESS: 'success',
        WAITING: 'waiting',
        UPLOADING: 'uploading',
        ERROR: 'error',
        TIMEOUT: 'timeout',
        ABORT: 'abort'
    };

    /**
     * 设置fileView的状态
     */
    Uploader.setStateClass = function(dom, state, prefix) {
        var k, v,
            $dom = $(dom),
            states = this.state;
        for (k in states) {
            v = states[k];
            if (states.hasOwnProperty(k) && state !== v) {
                $dom.removeClass(prefix + v);
            }
        }
        $dom.addClass(prefix + state);
        return this;
    };

    /**
     * 检查input是否支持type="file"
     *
     */
    Uploader.isSupported = function() {
        var input = document.createElement('input'),
            support = false;
        input.type = 'file';
        // ios < 6, 会设置input为disabled
        if (input.type === 'file' && !input.disabled) {
            support = true;
        }
        this.isSupported = function() {
            return support;
        };
        return support;
    };

    /**
     * 是否支持drag和drop
     *
     */
    Uploader.supportDrag = function() {
        var div = document.createElement('div'),
            support = ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
        this.supportDrag = function() {
            return support;
        };
        return support;
    };

    /**
     * 是否支持xhr
     */
    Uploader.supportXhr = function() {
        var input = document.createElement('input'),
            support;
        input.type = 'file';
        support = (
            'multiple' in input &&
            'files' in input &&
                typeof File != "undefined" &&
                typeof FormData != "undefined" &&
                typeof (new XMLHttpRequest()).upload != "undefined" );

        this.supportXhr = function() {
            return support;
        };
        return support;
    };

    /**
     * 如果数组中没有push进去
     */
    Uploader.pushIfNotExist = function(array, id) {
        var i = 0,
            l = array.length,
            existed = false;
        for (; i<l; i++) {
            if (array[i] === id) {
                existed = true;
                break;
            }
        }

        if (!existed) {
            array.push(id);
        }
        return existed;
    };

    /**
     * 如果数组中有就移除
     */
    Uploader.removeIfExist = function(array, id) {
        var i = 0,
            l = array.length;
        for (; i<l; i++) {
            if (id === array[i]) {
                array.splice(i, 1);
                return true;
            }
        }
        return false;
    };

    /**
     * init
     */
    Uploader.prototype._init = function() {
        this._setupButton();
        if (this.constructor.supportDrag() &&
            this.constructor.supportXhr() &&
            !this._option.forceUseForm) {
            this._setupDrag();
        }
        this.$view = $(this._option.viewTmpl);
        this.$container.append(this.$view);
    };

    /**
     * 设置上传按钮
     */
    Uploader.prototype._setupButton = function() {
        var self = this;
        self.$container.html( G.format(self._option.buttonTmpl, self._option.name) );
        self.$button = self.$container.find('input[type=file]');
        if (self.constructor.supportXhr() && !this._option.forceUseForm) {
            self.$button.attr('multiple', 'mulitple');
        }
        self.$button.change(function onChange() {
            var $this = $(this),
                $clone = $this.clone(),
                id;
            // update
            $this.replaceWith($clone);
            $this.detach();
            // add input
            id = self._addUpload(this);
            // autoUpload on change
            if (self._option.uploadOnChange) {
                self.upload(id);
            }
            // bind new event
            $clone.change(onChange);
        });
    };

    /**
     * 设置拖动上传区域
     */
    Uploader.prototype._setupDrag = function() {
        var self = this;
        self.$drag = $(G.format(self._option.dragTmpl));
        self.$container.append(self.$drag);
        self.$drag.attr('draggable', 'draggable');
        self.$drag
            .bind('dragenter', function() {
                self.$drag.addClass(self._option.dragStateClassPrefix + 'enter');
                self.fire('dragenter');
            })
            .bind('dragleave', function(e) {
                self.$drag.removeClass(self._option.dragStateClassPrefix + 'enter');
                self.fire('dragleave');
            })
            .bind('drop', function(e) {
                e.preventDefault();
                self.$drag.removeClass(self._option.dragStateClassPrefix + 'enter');
                var i = 0,
                    fileList = e.originalEvent.dataTransfer.files,
                    l = fileList.length,
                    file,
                    id;
                for (; i<l; i++) {
                    file = fileList[i];
                    id = self._addOneUpload(file);
                    if (self._option.uploadOnChange) {
                        self.upload(id);
                    }
                }
            });
    };

    /**
     * 获取唯一标识
     */
    Uploader.prototype._getUploadId = function() {
        return '__UPLOADERS-' + uniqueId++;
    };

    /**
     * 为上传组件添加input
     *
     * @param {object} input dom元素
     * @return {string/array} id 返回分配的id，如果浏览器支持multiple则返回id的数组
     */
    Uploader.prototype._addUpload = function(input) {
        if (this.constructor.supportXhr() && !this._option.forceUseForm) {
            var i = 0,
                fileList = input.files,
                l = fileList.length,
                file,
                re = [];
            for (; i<l; i++) {
                file = fileList[i];
                re.push(this._addOneUpload(file));
            }
            return re;
        } else {
            return this._addOneUpload(input);
        }
    };

    /**
     * 添加单个上传
     */
    Uploader.prototype._addOneUpload = function(input) {
        if (this.count >= this.maxCount) {
            this.fire('addTooManyFiles', input, this.count);
            return -1;
        }

        // add input
        var id = this._getUploadId(),
            $fileView;
        this._uploads[id] = input;
        this._queue.push(id);
        this.count++;

        $fileView = $(G.format(this._option.fileViewTmpl, {id: id, filename: this.getFileName(id) }));
        this._fileViews[id] = $fileView[0];
        this.$view.prepend($fileView);
        return id;
    };

    /**
     * 移除上传
     * @param {string} id
     */
    Uploader.prototype.removeUpload = function(id) {
        var Klass = this.constructor,
            fileView = this._fileViews[id];
        // remove waiting/connections/inputs
        Klass.removeIfExist(this._waiting, id);
        this.abort(id);

        // remove queue/fileViews/_uploads
        Klass.removeIfExist(this._queue, id);
        if (fileView) {
            $(this._fileViews[id]).remove();
            delete this._fileViews[id];
        }
        delete this._uploads[id];
        return this;
    };

    /**
     * 依据id获取文件名字
     *
     * @param {string} id
     * @return {string} filename
     */
    Uploader.prototype.getFileName = function(id) {
        if (this.constructor.supportXhr() && !this._option.forceUseForm) {
            var file = this._uploads[id];
            return file.fileName != null ? file.fileName : file.name;
        } else {
            return this._uploads[id].value.replace(/.*(\/|\\)/, "");
        }
    };

    /**
     * 上传所有等待队列中的文件
     */
    Uploader.prototype.uploadAll = function(id) {
        var i = 0,
            l = this._queue.length;
        for (; i<l; i++) {
            this.upload(this._queue[i]);
        }
        return this;
    };

    /**
     * 上传文件（单个或多个）
     * @param {string/array} ids
     */
    Uploader.prototype.upload = function(ids) {
        if (G.type(ids) === 'array') {
            var i = 0,
                l = ids.length;
            for (; i<l; i++) {
                this._uploadOne(ids[i]);
            }
        } else {
            this._uploadOne(ids);
        }
        return this;
    };

    /**
     * 上传单个文件
     */
    Uploader.prototype._uploadOne = function(id) {
        var fileName = this.getFileName(id),
            params;

        // too many connections
        if (this._connections.length >= this.maxConnection) {
            this._intoWaiting(id);
            return this;
        }

        // if is in connection
        if (this._intoConnections(id)) {
            return this;
        }

        // make params
        params = $.extend(this._params, {filename: encodeURIComponent(fileName)});

        // upload
        if (this.constructor.supportXhr() && !this._option.forceUseForm) {
            this._uploadByXhr(id, params);
        } else {
            this._uploadByForm(id, params);
        }
        return this;
    };

    /**
     * 取消正在上传中的文件，但不会移除队列
     */
    Uploader.prototype.abort = function(id, isTimeout) {
        var abort = this._abortFunc[id];
        if (abort) {
            delete this._abortFunc[id];
            abort();
        }

        if (!isTimeout) {
            this.fire('abort', id);
            this._finishConnection(id, this.constructor.state.ABORT);
        } else {
            this.fire('timeout', id);
            this._finishConnection(id, this.constructor.state.TIMEOUT);
        }
        return this;
    };

    /**
     * 进入waiting队列
     *
     * @param {string} id
     * @return {boolean} 是否已经在waiting队列中
     */
    Uploader.prototype._intoWaiting = function(id) {
        var Klass = this.constructor,
            re;
        Klass.removeIfExist(this._queue, id);
        re = Klass.pushIfNotExist(this._waiting, id);
        this.fire('waiting', id);
        this.fire('stateChange', id, Klass.state.WAITING);
        return re;
    };

    /**
     * 进入connection队列
     *
     * @param {string} id
     * @return {boolean} 是否已经在connection队列中
     */
    Uploader.prototype._intoConnections = function(id) {
        var Klass = this.constructor,
            re;
        Klass.removeIfExist(this._queue, id);
        Klass.removeIfExist(this._waiting, id);
        re = Klass.pushIfNotExist(this._connections, id);
        this.fire('uploading', id);
        this.fire('stateChange', id, Klass.state.UPLOADING);
        return re;
    };

    /**
     * 完成上传后执行的操作
     */
    Uploader.prototype._finishConnection = function(id, state) {
        var Klass = this.constructor;
        Klass.removeIfExist(this._connections, id);
        this.fire('complete', id, state);
        this.fire('stateChange', id, state);
    };

    /**
     * 使用XMLHttpRequest上传
     */
    Uploader.prototype._uploadByXhr = function(id, params) {
        var xhr = new XMLHttpRequest(),
            self = this,
            name = params.filename,
            file = self.getUpload(id),
            formData = new FormData(),
            state, timeoutInterval;
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                self.fire('progress', id, e.loaded, e.total);
            }
        };
        xhr.onreadystatechange = function(e) {
            if (xhr.readyState == 4) {
                if (timeoutInterval) {
                    clearTimeout(timeoutInterval);
                }
                if (xhr.status === 200) {
                    var data = xhr.responseText;
                    try {
                        data = $.parseJSON(data);
                    } catch(e) {
                        data = {error: 3, msg: self._option.defaultFailMsg};
                    }
                    if (data.error == null) {
                        self.fire('success', id, data);
                        state = self.constructor.state.SUCCESS;
                    } else {
                        self.fire('error', id, data);
                        state = self.constructor.state.ERROR;
                    }
                } else {
                    self.fire('error', id, {error: 2, msg: '上传失败'});
                    state = self.constructor.state.ERROR;
                }
                self._finishConnection(id, state);
            }
        };
        xhr.open('POST', self.uploadUrl, true);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("Cache-Control", "no-cache");
        // append data
        formData.append(self.uploadName, file);
        G.each(params, function(v, k) {
            formData.append(k, v);
        });

        self._abortFunc[id] = function() {
            xhr.abort();
            if (timeoutInterval) {
                clearTimeout(timeoutInterval);
            }
        };

        timeoutInterval = setTimeout(function() {
            timeoutInterval = null;
            self.abort(id, true);
        }, self._option.timeout);

        xhr.send(formData);
    };

    /**
     * 使用iframe+form上传
     */
    Uploader.prototype._uploadByForm = function(id, params) {
        var self = this,
            timeoutInterval,
            iframeId = 'hidden_iframe_' + id,
            formId = 'hidden_form_' + id,
            $input = $(self.getUpload(id)),
            $iframe = $('<iframe id="' + iframeId + '" name="' + iframeId + '" />') //对于 IE 要在创建的字符串就给出 id 和 name，如果 $('<iframe/>').attr('name', ...)，form 设置 target 到这个 iframe 仍然会提交到新窗口
                .css('display', 'none')
                .appendTo('body'),
            $form = $input.wrap('<form/>').parent()
                    .css('display', 'none')
                    .attr({
                        'id': formId,
                        'name': formId,
                        'target': iframeId,
                        'enctype': 'multipart/form-data',
                        'encoding': 'multipart/form-data',
                        'action': self.uploadUrl,
                        'method': 'POST'
                    })
                    .appendTo('body');

        $.each(params, function (i, el) {
            $('<input type="hidden"/>').attr('name', i ).val( el ).appendTo( $form );
        });

        $iframe.bind('load', function () {
            if (timeoutInterval) {
                clearTimeout(timeoutInterval);
            }
            var data,
                state;
            try {
                data = $.parseJSON($iframe.contents().text());
            } catch (e) {
                data = {error: 1, msg: self._option.defaultFailMsg};
            }

            if (data.error == null) {
                self.fire('success', id, data);
                state = self.constructor.state.SUCCESS;
            } else {
                self.fire('error', id, data);
                state = self.constructor.state.ERROR;
            }
            self._finishConnection(id, state);
            // 使用timeout避免 remove 会造成网页 favicon 一直在转圈浏览器一直显示正在 loading
            setTimeout(function() {
                $iframe.remove();
            }, 50);
        });

        this._abortFunc[id] = function() {
            $form.remove();
            $iframe.remove();
            if (timeoutInterval) {
                clearTimeout(timeoutInterval);
            }
        };

        timeoutInterval = setTimeout(function() {
            timeoutInterval = null;
            self.abort(id, true);
        }, self._option.timeout);

        $form.submit();
    };

    /**
     * 获取上传文件
     *
     * @param {string} id
     * @return {object} dom input / file object(File)
     *
     */
    Uploader.prototype.getUpload = function(id) {
        return this._uploads[id];
    };

    /**
     * 获取上传文件对应的fileView
     */
    Uploader.prototype.getFileView = function(id) {
        return this._fileViews[id];
    };

    /**
     * 移除整个组件，释放内存，删除添加的html
     */
    Uploader.prototype.remove = function() {
        var self = this;
        self.$drag = null;
        self.$button = null;
        self.$container.html('');
        self.$container = null;
        self._option = null;
        self._abortFunc = null;
        self._connections = null;
        self._waiting = null;
        self._queue = null;
        self._fileViews = null;
        self._uploads = null;
    };

    return Uploader;
});
