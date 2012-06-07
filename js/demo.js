//@import "lib/Overlay.js";
G.def('./demo', ['Overlay'], function (Overlay) {
    new Overlay()
            .title('果壳前端组件')
            .open('<div style="text-align:center;"><img style="width:110px;margin:0 auto;" src="http://www.guokr.com/skin/mini_logo/sex_b.jpg"></img><p>Hello world</p></div>');
});
