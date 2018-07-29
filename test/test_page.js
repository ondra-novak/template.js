

var View = TemplateJS.View;
var tableView;
var formView;

function start() {
	"use strict";
	
	var users = {};
	var counter = 1;
	
	var root = View.createPageRoot(View.VISIBLE);
	root.loadTemplate("mainpage")
	var ppltable = root.createView("tablepart");
	ppltable.loadTemplate("ppltable")
	ppltable.setData({"addbut":{"!click":addUser},
		          "deleteall":{"!click":markDeleteAll},
		          "delbutt":{"!click":delSelected}
				});
	
	
	tableView = ppltable;
	function addUser() {
		editAction(null);
	}
	
	function validateAndSave(id) {		
		var data = this.readData();
		var editid = id?id:""+(counter++);
		data["editbutt"] = {"!click":editAction.bind(null,editid)};
		data["delete"] = {"!click":checkselected};
		data["@id"] = editid;
		users[editid] = data;		
		ppltable.setData({"rows":Object.values(users)});	
	}
	
	function editAction(id) {
		var dlg = View.createFromTemplate("fillform");
		if (id) dlg.setData(users[id]);
		dlg.openModal();		
		dlg.setCancelAction(function() {dlg.close();}, "cancelbutt");
		dlg.setDefaultAction(function() {dlg.close().then(validateAndSave.bind(dlg,id))}, "okbutt");
		formView = dlg;
		return dlg;
	}
	
	function markDeleteAll() {
		var state = ppltable.readData();
		state.rows.forEach(function(x){
			x["delete"] = state.deleteall;
		});
		state["delbutt"] = {".disabled":state.deleteall==false || state.rows == 0};
		ppltable.setData(state);
		
	}
	
	function checkselected() {
		var state = ppltable.readData();
		var checked = state.rows.find(function(x){return x["delete"] != false;}) !== undefined;
		state["delbutt"] = {".disabled":!checked};
		ppltable.setData(state);
	}

	function delSelected() {
		var state = ppltable.readData();
		var newrows = state.rows.filter(function(x) {
			var d = x["delete"]==false;
			if (!d) delete users[x["@id"]];
			return d;
		});
		state.rows = newrows;
		ppltable.setData(state);		
		checkselected();
		users = state.rows;
		
	}
	
	checkselected();
	
}