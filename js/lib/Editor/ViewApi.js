/**
 * View mod api for editor
 * @author mzhou
 * @version 0.1
 * @log 0.1
 */

/*jshint undef:true, browser:true, noarg:true, curly:true, regexp:true, newcap:true, trailing:true, noempty:true, regexp:false, strict:true, evil:true, funcscope:true, iterator:true, loopfunc:true, multistr:true, boss:true, eqnull:true, eqeqeq:true, undef:true */
/*global G:true, console:false, GJS_VERSION:false, GJS_PRELOAD:false, GJS_URL:false, GJS_LIB_URL:false */

G.def('Editor/ViewApi', function() {
	function ViewApi(win, doc) {
		this.win = win;
		this.doc = doc;
	}
	ViewApi.prototype.execCommand = function() {
		if (this.doc) {
			this.doc.execCommand.apply(this.doc, arguments);
		}
	};

	return ViewApi;
});