

var View = TemplateJS.View;
var tableView;
var formView;

function start() {
	"use strict";
	
	var users = {};
	var counter = 1;
	
	var root = View.createFromTemplate("mainpage");
	root.open();
	var list = View.createFromTemplate("ppltable");
	root.setData({"tablepart": list});
	list.setData({"addbut":{"!click":addUser},
		          "deleteall":{"!click":markDeleteAll},
		          "delbutt":{"!click":delSelected}
				});
	
	
	tableView = list;
	function addUser() {
		var dlg = View.createFromTemplate("fillform");
		dlg.openModal();		
		dlg.setFirstTabElement("first_name");
		dlg.setCancelAction(function() {dlg.close();}, "cancelbutt");
		dlg.setDefaultAction(validateAndSave.bind(dlg,null), "okbutt");
		formView = dlg;
	}
	
	function validateAndSave(id) {		
		var data = this.readData();
		var editid = id?id:""+(counter++);
		data["editbutt"] = {"!click":editAction.bind(null,editid)};
		data["delete"] = {"!click":checkselected};
		data["_id"] = editid;
		users[editid] = data;		
		list.setData({"rows":Object.values(users)});	
		this.close();
	}
	
	function editAction(id) {
		var dlg = View.createFromTemplate("fillform");
		dlg.setData(users[id]);
		dlg.openModal();		
		dlg.setFirstTabElement("first_name");
		dlg.setCancelAction(function() {dlg.close();}, "cancelbutt");
		dlg.setDefaultAction(validateAndSave.bind(dlg,id), "okbutt");
		formView = dlg;
	}
	
	function markDeleteAll() {
		var state = list.readData();
		state.rows.forEach(function(x){
			x["delete"] = state.deleteall;
		});
		state["delbutt"] = {".disabled":state.deleteall==false || state.rows == 0};
		list.setData(state);
		
	}
	
	function checkselected() {
		var state = list.readData();
		var checked = state.rows.find(function(x){return x["delete"] != false;}) !== undefined;
		state["delbutt"] = {".disabled":!checked};
		list.setData(state);
	}

	function delSelected() {
		var state = list.readData();
		var newrows = state.rows.filter(function(x) {return x["delete"]==false;});
		state.rows = newrows;
		list.setData(state);
		checkselected();
		
	}
	
	checkselected();
	
}