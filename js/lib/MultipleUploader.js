/**
 * 用于多文件上传的组件
 *  对于支持multiple属性的浏览器一次选择多份文件
 *
 *
 *
 */


/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def('MultipleUploader', ['Event'], function(Event) {
    'use strict';
    var defaultOption = {
            buttonTmpl: '<input type="file" name="{v}" />',
            viewTmpl: '<ul></ul>',
            fileView: '<li data-id="{id}">{filename}</li>',
            name: 'fileUploader',
            uploadOnChange: false,
            maxCount: 10,
            maxConnection: 2,
            defaultFailMsg: '上传失败',
            stateClassPrefix: 'gui-multiple-'
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

        // upload waiting file
        self.on('complete', function(id, state) {
            var firstWaitingId = self._waiting[self._waiting.length-1];
            // upload waitings
            if (firstWaitingId) {
                self.upload(firstWaitingId);
            }
        });
        // setup fileViews state
        self.on('stateChange', function(id, state) {
            self.constructor.setStateClass($(self.getFileView(id)), state, self._option.stateClassPrefix);
        });
    }
    Event.extend(Uploader);

    Uploader.state = {
        SUCCESS: 'success',
        WAITING: 'waiting',
        UPLOADING: 'uploading',
        ERROR: 'error',
        TIMEOUT: 'timeout',
        ABORT: 'abort'
    };

    Uploader.setStateClass = function($dom, state, prefix) {
        var k, v,
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

    Uploader.pushIfExist = function(array, id) {
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
        var self = this;
        self._newButton();
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

    Uploader.prototype._newButton = function() {
        this.$container.html( G.format(this._option.buttonTmpl, this._option.name) );
        this.$button = this.$container.find('input[type=file]');
        // name of input
        this.uploadName = this.$button.attr('name');
        this.$view = $(this._option.viewTmpl);
        this.$container.append(this.$view);
        if (this.constructor.supportXhr()) {
            this.$button.attr('multiple', 'mulitple');
        }
    };

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
        if (this.constructor.supportXhr()) {
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

        $fileView = G.format(this._option.fileView, {id: id, filename: this.getFileName(id) });
        this._fileViews[id] = $fileView[0];
        this.$view.append($fileView);
        return id;
    };

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
     * NOTE: 当提交结束之后，便获取不到名字
     *
     * @param {string} id
     * @return {string} filename
     *
     */
    Uploader.prototype.getFileName = function(id) {
        if (this.constructor.supportXhr()) {
            var file = this._uploads[id];
            return file.fileName != null ? file.fileName : file.name;
        } else {
            return this._uploads[id].value.replace(/.*(\/|\\)/, "");
        }
    };

    Uploader.prototype.uploadAll = function(id) {
        var i = 0,
            l = this._queue.length;
        for (; i<l; i++) {
            this.upload(this._queue[i]);
        }
        return this;
    };

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

    Uploader.prototype._uploadOne = function(id) {
        var fileName = this.getFileName(id),
            params;

        // too many connections
        if (this._connections.length >= this.maxConnection) {
            this._intoWaiting(id);
            return this;
        }

        // if is in connection
        if (!this._intoConnections(id)) {
            return this;
        }

        // make params
        params = $.extend(this._params, {filename: fileName});

        // upload
        if (this.constructor.supportXhr()) {
            this._uploadByXhr(id, params);
        } else {
            this._uploadByForm(id, params);
        }
        return this;
    };

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

    Uploader.prototype._intoWaiting = function(id) {
        var Klass = this.constructor,
            re;
        Klass.removeIfExist(this._queue, id);
        re = Klass.pushIfExist(this._waiting, id);
        this.fire('waiting', id);
        this.fire('stateChange', id, Klass.state.WAITING);
        return re;
    };

    Uploader.prototype._intoConnections = function(id) {
        var Klass = this.constructor,
            re;
        Klass.removeIfExist(this._queue, id);
        Klass.removeIfExist(this._waiting, id);
        re = Klass.pushIfExist(this._connnections, id);
        this.fire('uploading', id);
        this.fire('stateChange', id, Klass.state.UPLOADING);
        return re;
    };

    Uploader.prototype._finishConnection = function(id, state) {
        var Klass = this.constructor;
        Klass.removeIfExist(this._connnections, id);
        this.fire('complete', id, state);
        this.fire('stateChange', id, state);
    };

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
                if (xhr.status === 200) {
                    var data = xhr.response;
                    if (data.error) {
                        self.fire('error', id, data);
                        state = self.constructor.state.ERROR;
                    } else {
                        self.fire('success', id, data);
                        state = self.constructor.state.SUCCESS;
                    }
                } else {
                    self.fire('error', id, data);
                    state = self.constructor.state.ERROR;
                }
                self._finishConnection(id, state);
            }
        };
        xhr.responseType = 'json';
        xhr.open('POST', $.param(params), true);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("X-File-Name", encodeURIComponent(name));
        xhr.setRequestHeader("Cache-Control", "no-cache");
        formData.append(self.uploadName, file);

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
            clearTimeout(timeoutInterval);
            var data,
                state;
            try {
                data = $.parseJSON($iframe.contents().text());
            } catch (e) {
                data = {error: 1, msg: self._option.defaultFailMsg};
            }
            if (data.error) {
                self.fire('success', id, data);
                state = self.constructor.state.SUCCESS;
            } else {
                self.fire('error', id, data);
                state = self.constructor.state.ERROR;
            }
            self._finishConnection(id, state);
            //$iframe.remove();//TODO: 这样 remove 会造成网页 favicon 一直在转圈浏览器一直显示正在 loading
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
     * get input dom or file
     *
     * @param {string} id
     * @return {object} dom input / file object(File)
     *
     */
    Uploader.prototype.getUpload = function(id) {
        return this._uploads[id];
    };

    Uploader.prototype.getFileView = function(id) {
        return this._fileViews[id];
    };

    Uploader.prototype.remove = function() {

    };

    return Uploader;
});
