/**
 * Textarea api for Editor
 * @author mzhou
 * @version 0.1
 * @log 0.1
 */

/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:true, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:true, undef:true */
/*global G:true, console:false, GJS_VERSION:false, GJS_PRELOAD:false, GJS_URL:false, GJS_LIB_URL:false */

//@import "../TextUtil.js";

G.def('Editor/TextApi', ['../TextUtils.js'], function(TextUtils) {
	'use strict';
	function TextApi($textarea) {
		this.$text = $textarea;
	}
	TextApi.prototype.getSelection = function() {
		return this.$text.getSelection.apply(this.$text, arguments);
	};
	TextApi.prototype.setSelection = function() {
		this.$text.setSelection.apply(this.$text, arguments);
		return this;
	};
	TextApi.prototype.collapseSelection = function() {
		this.$text.collapseSelection.apply(this.$text, arguments);
		return this;
	};
	TextApi.prototype.deleteSelectedText = function() {
		this.$text.deleteSelectedText.apply(this.$text, arguments);
		return this;
	};
	TextApi.prototype.deleteText = function() {
		this.$text.deleteText.apply(this.$text, arguments);
		return this;
	};
	TextApi.prototype.extractSelectedText = function() {
		return this.$text.extractSelectedText.apply(this.$text, arguments);
	};
	TextApi.prototype.insertText = function() {
		this.$text.insertText.apply(this.$text, arguments);
		return this;
	};
	TextApi.prototype.replaceSelectedText = function() {
		this.$text.replaceSelectedText.apply(this.$text, arguments);
		return this;
	};
	TextApi.prototype.surroundSelectedText = function() {
		this.$text.surroundSelectedText.apply(this.$text, arguments);
		return this;
	};
	TextApi.prototype.insertCaret = function() {
		this.$text.insertCaret.apply(this.$text, arguments);
		return this;
	};

	return TextApi;
});