/**
 * italicTag plugin
 * @author  mzhou
 * @version 0.1
 * @log 0.1
 *
 */

/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:false, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr    :true, boss:true, eqnull:true, eqeqeq:false, undef:true */
/*global G:false, $:false */

G.def('Editor/italicTag', {
	name: 'italic',
	barHtml: '<a class="gui-ubb-italic" href="javascript:void 0;" title="斜体">斜体</a>',
	keyBind: 'I',
	action: function(editor, mod) {
		'use strict';
		editor.viewApi.execCommand('italic', false, '');
		editor.textApi.surroundSelectedText('[italic]', '[/italic]');
	}
	/*
	beforeSetup: function(editor) {

	},
	afterSetup: function(editor) {

	}*/
});