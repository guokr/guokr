
/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def('MultipleUploader', ['Event'], function(Event) {
    'use strict';
    var defaultOption = {
            buttonTmpl: '<input type="file" name="{v}" multiple />',
            viewTmpl: '<ul></ul>',
            fileView: '<li data-id="{id}">{filename}</li>',
            name: 'fileUploader',
            uploadOnChange: true,
            maxCount: 10,
            maxConnection: 2
        },
        uniqueId = 0;

    function Uploader(container, option) {
        this.$container = $(container);
        this._option = $.extend({}, option);
        this._params = this._option.params || {};
        this.maxCount = this._option.maxCount;
        this.maxConnection = this._option.maxConnection;
        this.count = 0;
        this._connections = [];
        this._waiting = [];
        this._queue = [];
        this._inputs = {};
        this._fileViews = {};
    }

    Uploader.supportXhr = function() {
        var input = document.createElement('input'),
            support;
        input.type = 'file';
        support = (
            'multiple' in input &&
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

    Event.extend(Uploader);

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
            id = self.addInput(this);
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
        this.$view = $(this._option.viewTmpl);
        this.$container.append(this.$view);
        if (this.constructor.supportXhr()) {
            this.$button.attr('multiple', 'mulitple');
        }
    };

    Uploader.prototype._getInputId = function() {
        return '__UPLOADERS-' + uniqueId++;
    };

    Uploader.prototype.addInput = function(input) {
        if (this.count >= this.maxCount) {
            this.fire('addTooManyFiles', input, this.count);
            return -1;
        }
        var id = this._getInputId(),
            $fileView;
        this._input[id] = input;
        this._queue.push(id);
        this.count++;

        $fileView = G.format(this._option.fileView, {id: id, filename: this.getFileName(id) });
        this._fileViews[id] = $fileView[0];
        this.$view.append($fileView);
        return id;
    };

    Uploader.prototype.removeInput = function(id) {
        var Klass = this.constructor,
            fileView = this._fileViews[id];
        Klass.removeIfExist(this._queue, id);
        Klass.removeIfExist(this._waiting, id);
        if (Klass.removeIfExist(this._waiting, id)) {
            this.abort(id);
        }
        delete this._inputs[id];
        if (fileView) {
            $(this._fileViews[id]).remove();
            delete this._fileViews[id];
        }
        return this;
    };

    Uploader.prototype.getFileName = function(id) {
        return this._inputs[id].value.replace(/.*(\/|\\)/, "");
    };

    Uploader.prototype.upload = function(id) {
        var fileName = this.getFileName(id),
            params;

        // too many connections
        if (this._connections.length >= this.maxConnection) {
            this._intoWaiting(id);
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

    Uploader.prototype.abort = function(id) {
        
    };

    Uploader.prototype._intoWaiting = function(id) {
        var Klass = this.constructor;
        Klass.removeIfExist(this._queue, id);
        return Klass.pushIfExist(this._waiting, id);
    };

    Uploader.prototype._intoConnections = function(id) {
        var Klass = this.constructor;
        Klass.removeIfExist(this._queue, id);
        Klass.removeIfExist(this._waiting, id);
        return Klass.pushIfExist(this._connnections, id);
    };

    Uploader.prototype._finishConnection = function(id) {
        this.fire('connectionComplete', id);
        delete this._inputs[id];
        return this.constructor.removeIfExist(this._connnections, id);
    };

    Uploader.prototype._uploadByXhr = function(id, params) {
    };

    Uploader.prototype._uploadByForm = function(id, params) {
    };

    Uploader.prototype.getInput = function(id) {
        return this._inputs[id];
    };

    Uploader.prototype.getFileView = function(id) {
        return this._fileViews[id];
    };

    Uploader.prototype.remove = function() {

    };
});
