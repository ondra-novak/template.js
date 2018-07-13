
///declare namespace TemplateJS
var TemplateJS = function(){
	"use strict";

	function loadTemplate(templateRef, templateTag) {
		
		var templEl;
		var templName;
		if (typeof templateRef == "string") {
			templEl = document.getElementById(templateRef);
			templName = templateRef;
		} else {
			templEl = templateRef;
		}
		
		if (!templEl) {
			throw new Error("Template element was not found: " + templateRef);
		}

		if (!templateTag) {
			if (templEl.dataset.tag) templateTag=templEl.dataset.tag; 
			else templateTag = "div";
		}
		
		var div = document.createElement(templateTag);
		if (templEl.dataset.class) {
			div.setAttribute("class", templEl.dataset.class);
		} else if (templName) {
			div.classList.add("templ_"+templName);				
		}
		
		if (templEl.dataset.style) {
			div.setAttribute("style", templEl.dataset.style);
		}
		
		if (templEl.content) {
			var imp = document.importNode(templEl.content,true);
			div.appendChild(imp);
		} else {
			var x = templEl.firstChild;
			while (x) {
				div.appendChild(x.cloneNode(true));
				x = x.nextSibling;
			}
		}
		return div;
	};
		

	function View(elem) {
		if (typeof elem == "string") elem = document.getElementById(elem);
		this.root = elem;
		this.rebuildDataMap();
		
	};
	
	function Group(element, parent, before) {
		this.element = element;
		this.parent = parent;
		this.before = before;
	}
	
	
	
	View.prototype.getRoot = function() {
		return this.root;
	}
	
	View.prototype.setContent = function(elem) {
		if (elem instanceof View) 
			return this.setContent(elem.getRoot());
		this.clearContent();
		this.root.appendChild(elem);
		this.rebuildDataMap();
	};
	
	View.prototype.loadTemplate = function(templateRef) {
		this.setContent(loadTemplate(templateRef));
	}
	
	View.clearContent = function(element) {
		var event = new Event("remove");
		var x =  element.firstChild
		while (x) {
			var y = x.nextSibling; 
			element.removeChild(x);
			x.dispatchEvent(event)
			x = y;
		}		
	}
	
	View.prototype.clearContent = function() {
		View.clearContent(this.root);
		this.byName = {};
	};
	
	///Creates view at element specified by its name
	View.prototype.createView = function(name) {
		var elem = this.byName[name];
		if (!elem) throw new Error("Cannot find item "+name);
		if (elem.length != 1) throw new Error("The element must be unique "+name);
		return new View(elem[0]);		
	}
	
	View.prototype.markSelector = function(className) {
		var items = this.root.querySelectorAll(className);
		var cnt = items.length;
		for (var i = 0; i < cnt; i++) {
			items[i].classList.add("mark");
		}
	};
	
	View.prototype.unmark = function() {
		var items = this.root.querySelector("mark");
		var cnt = items.length;
		for (var i = 0; i < cnt; i++) {
			items[i].classList.remove("mark");
		}
	};
	
	View.prototype.installKbdHandler = function() {
		if (this.kbdHandler) return;
		this.kbdHandler = function(ev) {
			var x = ev.which || ev.keyCode;
			if (x == 13 && this.defaultAction) {
				if (this.defaultAction(this)) {
					ev.preventDefault();
					ev.stopPropagation();
				}
			} else if (x == 27 && this.cancelAction) {
				if (this.cancelAction(this)) {
					ev.preventDefault();
					ev.stopPropagation();
				}			
			}		
		}.bind(this);
		this.root.addEventListener("keydown", this.kbdHandler);
	};
	
	View.prototype.setDefaultAction = function(fn) {
		this.defaultAction = fn;
		this.installKbdHandler();
	};
	View.prototype.setCancelAction = function(fn) {
		this.cancelAction = fn;
		this.installKbdHandler();
	};
	
	View.prototype.installFocusHandler = function(fn) {
		if (this.focusHandler) return;
		this.focusHandler = function(ev) {
			if (this.firstTabElement) {
				setTimeout(function() {
					var c = document.activeElement;
					while (c) {
						if (c == this.root) return;
						c = c.parentElement;
					}
					this.firstTabElement.focus();
				}.bind(this),1);
			}
		}.bind(this);
		this.root.addEventListener("focusout", this.focusHandler);
	};
	
	View.prototype.setFirstTabElement = function(el) {
		this.firstTabElement = el;
		this.firstTabElement.focus();
		this.installFocusHandler();
	}
	
	View.prototype.setContentWithAnim = function(el, animParams) {
		
		var durations = animParams.duration;
		var enterClass = animParams.enterClass;
		var exitClass = animParam.exitClass;
		var root = this.root;
	
		function leave() {
			var cur = this.root.firstChild
			if (cur) {
				cur.classList.replace(enterClass,exitClass);
				cur.classList.add(enterClass);
				return new Promise(function(ok){
					setTimeout(function(){
						root.removeChild(cur);
						ok();
					}.bind(this),duration);
				}.bind(this));
			} else {
				return new Promise(function(ok){ok();});
			}
		}
		
		function enter() {
			el.classList.add(enterClass);
			root.appendChild(el);			
			return new Promise(function(ok){
				setTimeout(ok,duration);
			});
		}
		
		if (this.nextPhase) {
			this.nextPhase = this.nextPhase.then(leave);
		} else {
			this.nextPhase = leave();	
		}
		this.nextPhase.then = this.nextPhase.then(enter);
		this.rebuildDataMap(el);
	}

	View.prototype.loadTemplateWithAnim = function(el, animParams) {
		this.setContentWithAnim(loadTemplate(el), animParams);
	}

	
	function Subgroup(elem, topelem) {
		this.elem = elem;		
		this.topelem = topelem;
	}
	
	Subgroup.prototype.contains = function(el) {
		while (el.parentNode) {
			if (el.parentNode == this.elem) return true;
			if (el.parentNode == this.topelem) return false;
			el = el.parentNode;
		}
		return false;
	}

	
	function GroupManager(template_el) {
		this.baseEl = template_el;
		this.parent = template_el.parentNode;
		this.idmap={};
		this.trnids=[];
		this.baseEl.hidden=true;
		this.result = [];
	}
	
	GroupManager.prototype.begin = function() {
		this.trnids=[];
		this.result = [];
	}
	
	GroupManager.prototype.setValue = function(id, data) {
		var x = this.idmap[id];
		if (!x) {
			var newel = this.baseEl.cloneNode(true);
			var newview = new View(newel);
			x = this.idmap[id] = newview;
			this.parent.insertBefore(newel, this.baseEl);
			newel.hidden = false;
			newel.removeAttribute("data-name");
			newel.removeAttribute("name");
		} else {
			this.parent.removeChild(x.getRoot());
			this.parent.insertBefore(x.getRoot(), this.baseEl);
		}
		this.trnids.push(id);
		var res =  x.setData(data);
		res = this.result.concat(res);		
	}
	
	GroupManager.prototype.finish = function() {
		var newidmap = {};
		this.trnids.forEach(function(x){			
			if (this.idmap[x]) {
				newidmap[x] = this.idmap[x];
				delete this.idmap[x];
			}			
		},this);
		for (var x in this.idmap) {
			try {
				this.parent.removeChild(this.idmap[x].getRoot());			
			} catch (e) {
				
			}
		}
		this.idmap = newidmap;
		this.trnids = [];
		return this.result;
		
	}
	
	GroupManager.prototype.readData = function() {
	
		var out = [];		
		for (var x in this.idmap) {
			var d = this.idmap[x].readData();
			d._id = x;
			out.push(d);			
		}
		return out;
		
	}

	View.prototype.rebuildDataMap = function(rootel) {
		if (!rootel) rootel = this.root;
		this.byName = {};
		var groups = [];
		var placeholders = [rootel.querySelectorAll("[data-name]"),rootel.querySelectorAll("[name]")]
		for (var x = 0; x < 2; x++) {
			var pl = placeholders[x];
			var i;			
			var cnt = pl.length;
			for (i = 0; i < cnt; i++) {
				var plx = pl[i];
				if (typeof groups.find(function(x) {return x.contains(plx);}) == "undefined") {
					var name = plx.name || plx.dataset.name;
					var lname = name.split(",");
					lname.forEach(function(vname) {								
						if (vname.endsWith("[]")) {
							groups.push(new Subgroup(plx,rootel));
							vname = vname.substr(0,vname.length-2);
							if (plx.template_js_group === undefined)
								plx.template_js_group = new GroupManager(plx);
						} 						
						if (!(vname in this.byName)) this.byName[vname] = [];
						this.byName[vname].push(plx);
					},this);
				}
			}
		}
	}
	
	///Sets data in the view
	/**
	 * @data structured data. Promise can be used as value, the value is rendered when the promise
	 *  is resolved
	 *  
	 * @return function returns promise, which resolves after all promises are resolved. If there
	 * were no promise, function returns resolved promise
	 */
	View.prototype.setData = function(data) {
		var me = this;
		var results = [];
		
		function processItem(itm, elemArr, val) {
				elemArr.forEach(function(elem) {
					var res /* = undefined*/;
					if (elem) {
						if (typeof val == "object" && !Array.isArray(val)) {
							
							if (val)
							
							me.updateElementAttributes(elem,val);
							if (!("value" in val)) {
								return;
							}else {
								val = val.value;
							} 
						}
						var eltype = elem.tagName;
						if (elem.dataset.type) eltype = elem.dataset.type;			
						if (val) {
							var eltypeuper = eltype.toUpperCase();
							if (View.customElements[eltypeuper]) {
								res = View.customElements[eltypeuper].setValue(elem,val);
							} else {
								res = updateBasicElement(elem, val);								
							}
						}
					}
					return res;
				});
			}
			
		
		
		for (var itm in data) {
			var elemArr = me.byName[itm];
			if (elemArr) {
				var val = data[itm];
				if (typeof val == "object" && (val instanceof Promise)) {
					results.push(val.then(processItem.bind(this,itm,elemArr)));
				} else {
					var r = processItem(itm,elemArr,val);
					if (typeof r != "undefined") results.push(r);
				}
			}
		}
		return results;
	}
	
	View.prototype.updateElementAttributes = function(elem,val) {
		for (var itm in val) {
			if (itm == "value") continue;
			if (itm == "classList" && typeof val[itm] == "object") {
				for (var x in val[itm]) {
					if (val[itm][x]) elem.classList.add(x);
					else elem.classList.remove(x);
				}
			} else if (itm.substr(0,1) == "!") {
				var name = itm.substr(1);
				var fn = val[itm];
				if (!elem._t_eventHandlers) {
					elem._t_eventHandlers = {};
				}
				if (elem._t_eventHandlers && elem._t_eventHandlers[name]) {
					var reg = elem._t_eventHandlers[name];
					elem.removeEventListener(name,reg);
				}
				elem._t_eventHandlers[name] = fn;
				elem.addEventListener(name, fn);
			} else if (itm.substr(0,1) == ".") {
				var name = itm.substr(1);
				var v = val[itm];
				if (typeof v == "undefined") {
					delete elem[name];
				} else {
					elem[name] = v;
				}					
			} else if (val[itm]===null) {
				elem.removeAttribute(itm);
			} else {
				elem.setAttribute(itm, val[itm].toString())
			} 
		}
	}
	
	function updateInputElement(elem, val) {
		var type = elem.getAttribute("type");
		if (type == "checkbox" || type == "radio") {
			if (typeof (val) == "boolean") {
				elem.checked = !(!val);
			} else if (typeof (val) == "object" && Array.isArray(val)) {
				elem.checked = val.indexOf(elem.value) != -1;
			} else if (typeof (val) == "string") {
				elem.checked = elem.value == val;
			} 
		} else {
			elem.value = val;
		}
	}
	
	
	function updateSelectElement(elem, val) {
		if (typeof val == "object") {
			var curVal = elem.value;
			View.clearContent(elem);
			if (Array.isArray(val)) {
				var i = 0;
				var l = val.length;
				while (i < l) {
					var opt = document.createElement("option");
					opt.appendChild(document.createTextNode(val[i].toString()));
					w.appendChild(opt);
				}
			} else {
				for (var itm in val) {
					var opt = document.createElement("option");
					opt.appendChild(document.createTextNode(val[itm].toString()));
					opt.setAttribute("value",itm);
					w.appendChild(opt);				
				}
			}
			elem.value = curVal;
		} else {
			elem.value = val;
		}
	}
	
	View.prototype.updateTextArea = function(elem, val) {
		elem.value = val.toString();
	}

	
	function updateBasicElement (elem, val) {
		if (typeof val == "object") {
			if (val instanceof Element) {
				View.clearContent(elem);
				elem.appendChild(val);
				return;
			} else {
				var group = elem.template_js_group;
				if (group) {
					group.begin();
					if (Array.isArray(val) ) {
						var i = 0;
						var cnt = val.length;
						for (i = 0; i < cnt; i++) {
							var id = val[i]._id || i;
							group.setValue(id, val[i]);
						}
						return group.finish();
					}
				}
			}
		} 
		View.clearContent(elem);			
		elem.appendChild(document.createTextNode(val));
	}
	
	View.prototype.readData = function(keys) {
		if (typeof keys == "undefined") {
			keys = Object.keys(this.byName);
		}
		var res = {};
		var me = this;
		keys.forEach(function(itm) {
			var elemArr = me.byName[itm];
			elemArr.forEach(function(elem){			
				if (elem && !elem.dataset.readonly) {
					var val;
					var eltype = elem.tagName;
					if (elem.dataset.type) eltype = elem.dataset.type;
					var eltypeuper = eltype.toUpperCase();
					if (View.customElements[eltypeuper]) {
						val = View.customElements[eltypeuper].getValue(elem, res[itm]);
					} else {
						val = readBasicElement(elem,res[itm]);					
					}
					if (typeof val != "undefined") {
						res[itm] = val;
					}
				}
			});
		});
		return res;
	}
	
	function readInputElement(elem, curVal) {
		var type = elem.getAttribute("type");
		if (type == "checkbox" || type == "radio") {
			if (typeof curVal == "undefined") {
				if (elem.checked) return elem.value;
				else return false;
			} else if (curVal === false) {
				if (elem.checked) return [elem.value];
				else return [];
			} else if (Array.isArray(curVal)) {
				if (elem.checked) return curVal.concat([elem.value]);
				else return curVal
			} else {
				if (elem.checked) return [curVal, elem.value];
				else return [curVal];
			}
		} else {
			return elem.value;
		}
	}
	function readSelectElement(elem) {
		return elem.value;	
	}
	View.prototype.readTemplateElement = function(elem) {
		var res = [];
		var prev = elem.previousSibling;
		
		if (prev && prev.dataset.container) {
			var x = prev.firstChild;
			while (x!=null) {
				var w = new View(x);
				res.push(w.readData());
				x = x.nextSibling;
			}
		} 
		return res;
	}
	
	function readBasicElement(elem) {
		var group = elem.template_js_group;
		if (group) {
			return group.readData();			
		} else {
			if (elem.contentEditable == "true" ) {
				if (elem.dataset.format == "html")
					return elem.innerHTML;
				else 
					return elem.innerText;
			}
		}
	}
	
	View.regCustomElement = function(tagName, customElementObject) {
		var upper = tagName.toUpperCase();
		View.customElements[upper] = customElementObject;
	}

	View.createPageRoot = function() {
		return new View(document.body.appendChild(document.createElement("page-root")));
	}
	
	function CustomElementEvents(setval,getval) {
		this.setValue = setval;
		this.getValue = getval;
		
	}

	View.customElements = {
			"INPUT":{
				"setValue":updateInputElement,
				"getValue":readInputElement,
			},
			"TEXTAREA":{
				"setValue":updateInputElement,
				"getValue":readInputElement,
			},
			"SELECT":{
				"setValue":updateSelectElement,
				"getValue":readSelectElement,
			},
			"IMG":{
				"setValue":function(elem,val) {
					elem.setAttribute("src",val);
				},
				"getValue":function(elem) {
					elem.getAttribute("src");
				}
			},
			"IFRAME":{
				"setValue":function(elem,val) {
					elem.setAttribute("src",val);
				},
				"getValue":function(elem) {
					elem.getAttribute("src");
				}
			}
	};

	
	
	return {
		"View":View,
		"loadTemplate":loadTemplate,
		"CustomElement":CustomElementEvents
	};
	
}();



