/**
 * linkTag plugin
 * @author  mzhou
 * @version 0.1
 * @log 0.1
 *
 */

/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr    :true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def('Editor/linkTag', {
	name: 'link',
	barHtml: '<a class="gui-ubb-link" href="javascript:void 0;" title="插入链接">插入链接</a>',
	keyBind: 'L',
	action: function(editor, mod) {
		'use strict';
		editor.viewApi.execCommand('link', false, '');
		editor.textApi.surroundSelectedText('[link]', '[/link]');
	}
	/*
	beforeSetup: function(editor) {

	},
	afterSetup: function(editor) {

	}*/
});