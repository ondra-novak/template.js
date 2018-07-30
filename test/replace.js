function start() {
	
	var View = TemplateJS.View;
	
	var curView = View.createEmpty();
	curView.openModal();
	
	function replaceWin(name,curView) {
		return new Promise(function(ok){
			var w = View.fromTemplate(name);
			w.setItemEvent("next","click",ok.bind(null,w));
			curView.replace(w);
		});
	}
	
	replaceWin("win1",curView)
		.then(replaceWin.bind(null,"win2"))
		.then(replaceWin.bind(null,"win3"))
		.then(function(v) {
			v.close();
		});
		
}