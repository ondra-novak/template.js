
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
		this.marked =[];
		this.groups =[];
		this.rebuildMap();		
		
	};
	
	function Group(element, parent, before) {
		this.element = element;
		this.parent = parent;
		this.before = before;
	}
	
	
	///Get root element of the view
	View.prototype.getRoot = function() {
		return this.root;
	}
	
	///Replace content of the view
	/**
	 * @param elem element which is put into the view. It can be also instance of View
	 */
	View.prototype.setContent = function(elem) {
		if (elem instanceof View) 
			return this.setContent(elem.getRoot());		
		this.clearContent();
		this.defaultAction = null;
		this.cancelAction = null;
		this.root.appendChild(elem);
		this.rebuildMap();
	};
	
	///Replace content of the view generated from the template
	/**
	 * @param templateRef ID of the template
	 */
	View.prototype.loadTemplate = function(templateRef) {
		this.setContent(loadTemplate(templateRef));
	}
	
	///Visibility state - whole view is hidden
	View.HIDDEN = 0;
	///Visibility state - whole view is visible
	View.VISIBLE = 1;
	///Visibility state - whole view is hidden, but still occupies area (transparent)
	View.TRANSPARENT=-1
	
	View.prototype.setVisibility = function(vis_state) {
		if (vis_state == View.VISIBLE) {
			this.root.hidden = false;
			this.root.style.visibility = "inherit";
		} else if (vis_state == View.TRANSPARENT) {
			this.root.hidden = false;
			this.root.style.visibility = "hidden";			
		} else {
			this.root.hidden = true;
		}
	}
	
	View.prototype.show = function() {
		this.setVisibility(View.VISIBLE);
	}
	
	View.prototype.hide = function() {
		this.setVisibility(View.HIDDEN);
	}
	
	///Closes the view by unmapping it from the doom
	/** The view can be remapped through the setConent or open() */
	View.prototype.close = function() {		
		this.root.parentElement.removeChild(this.root);
		if (this.modal_elem) this.modal_elem.parentElement.removeChild(this.modal_elem);
	}

	///Opens the view as toplevel window
	/** @note visual of toplevel window must be achieved through styles. 
	 * This function just only adds the view to root of page
	 */
	View.prototype.open = function() {
		document.body.appendChild(this.root);
	}

	///Opens the view as modal window
	/**
	 * Append lightbox which prevents
	 */
	View.prototype.openModal = function() {
		if (this.modal_elem) return;
		var lb = this.modal_elem = document.createElement("light-box");
		if (View.lightbox_class) lb.classList.add(View.lightbox_class);
		else lb.setAttribute("style", "display:block;position:fixed;left:0;top:0;width:100vw;height:100vh;"+View.lightbox_style);
		document.body.appendChild(lb);
		this.open();
	//	this.setFirstTabElement()
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
	/**@param name name of the element used as root of View
	 * @param visibility allows to specify visibility. Default is hidden, 
	 * 		so if you want to show the view, you have to call show 
	 */
	View.prototype.createView = function(name, visibility /* =View.HIDDEN */) {
		var elem = this.byName[name];
		if (!elem) throw new Error("Cannot find item "+name);		
		if (elem.length != 1) throw new Error("The element must be unique "+name);
		var view = new View(elem[0]);
		view.setVisibility(visibility);
		return view;
	}
	
	///Returns the name of class used for the mark() and unmark()
	/**
	 * If you need to use different name, you have to override this value
	 */
	View.prototype.markClass = "mark";	
	
	///Marks every element specified as CSS selector with a mark
	/**
	 * The mark class is stored in variable markClass. 
	 * This function is useful to mark elements for various purposes. For example if
	 * you need to highlight an error code, you can use selectors equal to error code. It
	 * will mark all elements that contain anything relate to that error code. Marked
	 * elements can be highlighted, or there can be hidden message which is exposed once
	 * it is marked
	 * 
	 */
	View.prototype.mark = function(selector) {
		var items = this.byName[selector];
		var cnt = items.length;
		for (var i = 0; i < cnt; i++) {
			items[i].classList.add(this.markClass);
			this.marked.push(items[i]);
		}		
		
	};
	
	///Removes all marks
	/** Useful to remove any highlight in the View
	 */
	View.prototype.unmark = function() {
		var cnt = this.marked.length;
		for (var i = 0; i < cnt; i++) {
			this.marked[i].classList.remove(this.markClass);
		}
		this.marked = [];
	};
	
	///Installs keyboard handler for keys ESC and ENTER
	/**
	 * This function is called by setDefaultAction or setCancelAction, do not call directly
	 */
	View.prototype._installKbdHandler = function() {
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
	
	///Sets function for default action
	/** Default action is action called when user presses ENTER. 
	 *
	 * @param fn a function called on default action. The function receives reference to
	 * the view as first argument. The function must return true to preven propagation
	 * of the event
	 * @param el_name optional, if set, corresponding element receives click event for default action
	 *                  (button OK in dialog)
	 * 
	 * The most common default action is to validate and sumbit entered data
	 */
	View.prototype.setDefaultAction = function(fn, el_name) {
		this.defaultAction = fn;
		this._installKbdHandler();
		if (el_name) {
			var data = {};
			data[el_name] = {"!click":fn};
			this.setData(data)
		}
	};

	///Sets function for cancel action
	/** Cancel action is action called when user presses ESC. 
	 *
	 * @param fn a function called on cancel action. The function receives reference to
	 * the view as first argument. The function must return true to preven propagation
	 * of the event

	 * @param el_name optional, if set, corresponding element receives click event for default action
	 *                  (button CANCEL in dialog)
	 * 
	 * The most common cancel action is to reset form or to exit current activity without 
	 * saving the data
	 */
	View.prototype.setCancelAction = function(fn, el_name) {
		this.cancelAction = fn;
		this._installKbdHandler();
		if (el_name) {
			var data = {};
			data[el_name] = {"!click":fn};
			this.setData(data)
		}
	};
	
	function walkDOM(el, fn) {
		var c = el.firstChild;
		while (c) {
			fn(c);
			walkDOM(c,fn);
			c = c.nextSibling;
		}
	}
	
	///Installs focus handler
	/** Function is called from setFirstTabElement, do not call directly */
	View.prototype._installFocusHandler = function(fn) {
		if (this.focus_top && this.focus_bottom) {
			if (this.focus_top.isConnected && this.focus_bottom.isConnected)
				return;
		}
		var focusHandler = function(where, ev) {
			setTimeout(function() {
				where.focus();
			},10);	
		};
		
		var highestTabIndex=null;
		var lowestTabIndex=null;
		var firstElement=null;
		var lastElement = null;
		walkDOM(this.root,function(x){
			if (typeof x.tabIndex == "number" && x.tabIndex != -1) {
				if (highestTabIndex===null) {
					highestTabIndex = lowestTabIndex = x.tabIndex;
					firstElement = x;
				} else {
					if (x.tabIndex >highestTabIndex) highestTabIndex = x.tabIndex;
					else if (x.tabIndex <lowestTabIndex) {
						lowestTabIndex= x.tabIndex;
						firstElement  = x;
					}
				}
				if (x.tabIndex == highestTabIndex) lastElement = x;
			}
		});
		
		if (firstElement && lastElement) {
			var le = document.createElement("focus-end");
			le.setAttribute("tabindex",highestTabIndex);
			le.style.display="block";
			this.root.appendChild(le);
			le.addEventListener("focus", focusHandler.bind(this,firstElement));
	
			var fe = document.createElement("focus-begin");
			fe.setAttribute("tabindex",highestTabIndex);
			fe.style.display="block";
			this.root.insertBefore(fe,this.root.firstChild);
			fe.addEventListener("focus", focusHandler.bind(this,lastElement));
		}				
		this.focus_top = firstElement;
		this.focus_bottom = lastElement;
	};
	
	///Sets first TAB element and installs focus handler
	/**
	 * @param el the first TAB element in the form, it also receives a focus. You should
	 * specify really first TAB, even if you need to move focus elsewhere. Just move the
	 * focus after setting the first TAB element.
	 * 
	 * The focus handler ensures that focus will not leave the current View by pressing TAB.
	 * key. Function provides of cycling of the focus on the View. The first TAB element 
	 * is need to have a home position defined.
	 */
	View.prototype.setFirstTabElement = function(el) {
		if (typeof el == "string") {
			var f = this.byName[el];
			if (f) return this.setFirstTabElement(f[0]);
			else throw new Error("Item was not found: "+el);
		}
		el.focus();
		this._installFocusHandler();
	}
	
	///Set contents of the view with animation
	/**
	 * @note The animation is achieved through CSS. The function doesn't animate anything,
	 * it only helps with timing
	 * 
	 * @param el element to set as new content. If there is other active element, it will be 
	 * replaced with animation
	 * @param animParams paramaters of animation, the object described below
	 * 
	 * animParams contains
	 * 
	 *  - duraction = specifies animation duration in milliseconds. Duration of enter animation
	 *  must me equal to duration of exit animation
	 *  - enterClass = class which contains enter animation
	 *  - exitClass = class which contains exit animation
	 *  - parallel = if set to true, enter and exit animation are played at same time. 
	 *                Default value is false, so first exit animation, then enter animation
	 *  - 
	 *  
	 *  @retun function returns promise which is resolved after content is replaced
	 *  
	 *  @note The content itself is considered as replaced instantly, so function
	 *  setData will work with the new content
	 *  
	 *   //TODO test
	 */
	View.prototype.setContentWithAnim = function(el, animParams) {
		
		var duration = animParams.duration;
		var enterClass = animParams.enterClass;
		var exitClass = animParams.exitClass;
		var parallel = animParams.parallel;
		
		var root = this.root;
	
		function leave() {
			var cur = root.firstChild
			if (cur) {
				cur.classList.remove(enterClass);
				cur.classList.add(exitClass);
				return new Promise(function(ok){
					setTimeout(function(){
						root.removeChild(cur);
						ok();
					},duration);
				});
			} else {
				return new Promise.resolve();
			}
		}
		
		function enter() {
			el.classList.add(enterClass);
			root.appendChild(el);			
		}
		
		if (this.nextPhase) {
			this.nextPhase = this.nextPhase.then(leave);
		} else {
			this.nextPhase = leave();	
		}

		this.rebuildMap(el);

		if (parallel) {
			this.nextPhase = Promise.all([this.nextPhase, enter()]);
		} else {
			this.nextPhase = this.nextPhase.then(enter);
		}
		return this.nextPhase;
	}

	///Loads template with animation
	/**
	 * @param t template ID
	 * @param animParams parameters of animation, see setContentWithAnim
	 */
	View.prototype.loadTemplateWithAnim = function(t, animParams) {
		return this.setContentWithAnim(loadTemplate(t), animParams);
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

	
	function GroupManager(template_el,name) {
		this.baseEl = template_el;
		this.parent = template_el.parentNode;
		this.anchor = document.createComment("><");
		this.idmap={};
		this.trnids=[];
		this.result = [];		
		this.parent.insertBefore(this.anchor, this.baseEl);
		this.parent.removeChild(this.baseEl);
		this.name = name;
		template_el.removeAttribute("data-name");
		template_el.removeAttribute("name");

	}
	
	GroupManager.prototype.isConnectedTo = function(elem) {
		return elem.contains(this.anchor);
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
			this.parent.insertBefore(newel, this.anchor);
		} else {
			this.parent.removeChild(x.getRoot());
			this.parent.insertBefore(x.getRoot(), this.anchor);
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
	
	///enables items
	/**
	 * @param name name of item
	 * @param enable true/false whether item has to be enabled
	 */
	View.prototype.enableItem = function(name, enable) {
		var d = {};
		d[name] = {"disabled":enable?null:""};
		this.setData(d);
	}

	///show or hide item
	/**
	 * @param name name of item
	 * @param showCmd true/false to show or hide item, or you can use constants View.VISIBLE,View.HIDDEN and View.TRANSPARENT
	 */
	View.prototype.showItem = function(name, showCmd) {
		var d = {};
		if (typeof showCmd == "boolean") {
			this.showItem(name,showCmd?View.VISIBLE:View.HIDDEN);
		}else {			
			if (showCmd == View.VISIBLE) {
				d[name] = {".hidden":false,".style.visibility":""};
			} else if (showCmd == View.TRANSPARENT) {
				d[name] = {".hidden":false,".style.visibility":"hidden"};
			} else {
				d[name] = {".hidden":true};
			}
		}
		this.setData(d);
	}

	///sets an event procedure to the item
	/**
	 * @param name name of item
	 * @param event name of event procedure
	 * @param fn function. To remove event procedure, specify null
	 * 
	 * @note it is faster to set the event procedure through setData along with other items
	 */
	View.prototype.setItemEvent = function(name, event, fn) {
		var d = {}
		var evdef = {};
		evdef["!"+event] = fn;
		d[name] = evdef;
		this.setData(d);
		
	}

	View.prototype.setItemValue = function(name, value) {
		var d = {};
		d[name] = {value:value}
		this.setData(d);
	}

	View.prototype.loadItemTemplate = function(name, template_name) {
		var v = View.createFromTemplate(template_name);
		this.setItemValue(name, v);
		return v;
	}
	
	View.prototype.clearItem = function(name) {
		this.setItemValue(name, null);
	}

	///Rebuilds map of elements
	/**
	 * This function is called in various situations especialy, after content of the
	 * View has been changed. The function must be called manually to register
	 * any new field added by function outside of the View.
	 * 
	 * After the map is builtm, you can access the elements through the variable byName["name"],
	 * Please do not modify the map manually
	 */
	View.prototype.rebuildMap = function(rootel) {
		if (!rootel) rootel = this.root;
		this.byName = {};
		
		this.groups = this.groups.filter(function(x) {return x.isConnectedTo(rootel);});
		this.groups.forEach(function(x) {this.byName[x.name] = x;},this);
		
		var elems = rootel.querySelectorAll("[data-name],[name]");
		var cnt = elems.length;
		var i;
		for (i = 0; i < cnt; i++) {
			var pl = elems[i];
			if (rootel.contains(pl)) {
				var name = pl.name || pl.dataset.name || pl.getAttribute("name");
				name.split(" ").forEach(function(vname) {
					if (vname) {
						if (vname && vname.endsWith("[]")) {
							vname = vname.substr(0,name.length-2);
							var gm = new GroupManager(pl, name);
							this.groups.push(gm);
							if (!Array.isArray(this.byName[vname])) this.byName[vname] = [];
							this.byName[vname].push(gm);
						} else{
							if (!Array.isArray(this.byName[vname])) this.byName[vname] = [];
							this.byName[vname].push(pl);
						}
					}
				},this);

				}
			}		
	}
	
	///Sets data in the view
	/**
	 * @param structured data. Promise can be used as value, the value is rendered when the promise
	 *  is resolved
	 *  
	 * @return function returns array results generated during the process. It is
	 * purposed to return array of promises if any action require to perform operation using
	 * Promise. If there is no such operation, result is empty array. You can use Promise.all() 
	 * on result.
	 */
	View.prototype.setData = function(data) {
		var me = this;
		var results = [];
		
		function checkSpecialValue(val, elem) {
			if (val instanceof Element) {
				View.clearContent(elem)
				elem.appendChild(val);
				me.rebuildMap();
				return true;
			} else if (val instanceof View) {
				View.clearContent(elem)
				elem.appendChild(val.getRoot());
				me.rebuildMap();
				return true;
			}			
		}
		
		function processItem(itm, elemArr, val) {
					elemArr.forEach(function(elem) {
						var res /* = undefined*/;
						if (elem) {
							if (typeof val == "object") {
								if (checkSpecialValue(val,elem)) {
									return							
								} else if (!Array.isArray(val)) {
									updateElementAttributes(elem,val);
									if (!("value" in val)) {
										return;
									}else {
										val = val.value;
										if (typeof val == "object" && checkSpecialValue(val,elem)) return;
									}
								}
							}
							if (elem instanceof GroupManager) {
								var group = elem;
								group.begin();
								if (Array.isArray(val) ) {
									var i = 0;
									var cnt = val.length;
									for (i = 0; i < cnt; i++) {
										var id = val[i]._id || i;
										group.setValue(id, val[i]);
									}
								}
								return group.finish();
							} else {
								var eltype = elem.tagName;
								if (elem.dataset.type) eltype = elem.dataset.type;			
								if (val !== undefined) {
									var eltypeuper = eltype.toUpperCase();
									if (View.customElements[eltypeuper]) {
										res = View.customElements[eltypeuper].setValue(elem,val);
									} else {
										res = updateBasicElement(elem, val);								
									}
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
	
	function updateElementAttributes (elem,val) {
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
				var obj = elem;
				var nextobj;
				var idx;
				var subkey;
				while ((idx = name.indexOf(".")) != -1) {
					subkey = name.substr(0,idx);
					nextobj = obj[subkey];
					if (nextobj == undefined) {
						if (v !== undefined) nextobj = obj[subkey] = {};
						else return;
					}
					name = name.substr(idx+1);
					obj = nextobj;
				}
				var v = val[itm];
				if ( v === undefined) {
					delete obj[name];
				} else {
					obj[name] = v;
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
	
	function updateBasicElement (elem, val) {
		if (Array.isArray(val)) {
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
		View.clearContent(elem);
		if (val !== null && val !== undefined) {
			elem.appendChild(document.createTextNode(val));
		}
	}

	///Reads data from the elements
	/**
	 * For each named element, the field is created in result Object. If there
	 * are multiple values for the name, they are put to the array.
	 * 
	 * Because many named elements are purposed to only display values and not enter
	 * values, you can mark such elements as data-readonly="1"
	 */
	View.prototype.readData = function(keys) {
		if (typeof keys == "undefined") {
			keys = Object.keys(this.byName);
		}
		var res = {};
		var me = this;
		keys.forEach(function(itm) {
			var elemArr = me.byName[itm];
			elemArr.forEach(function(elem){			
				if (elem) {					
					if (elem instanceof GroupManager) {
						var x =  elem.readData();
						if (res[itm] === undefined) res[itm] = x;
						else x.forEach(function(c){res[itm].push(c);});
					} else if (!elem.dataset || !elem.dataset.readonly) {
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
	
	///Registers custrom element
	/**
	 * @param tagName name of the tag
	 * @param customElementObject new CustomElementEvents(setFunction(),getFunction())
	 */
	View.regCustomElement = function(tagName, customElementObject) {
		var upper = tagName.toUpperCase();
		View.customElements[upper] = customElementObject;
	}

	///Creates root View in current page
	/**
	 * @param visibility of the view. Because the default value is View.HIDDEN, if called
	 * without arguments the view will be hidden and must be shown by the function show()
	 */
	View.createPageRoot = function(visibility /* = View.HIDDEN */) {
		var elem = document.createElement("toplevel-view");
		document.body.appendChild(elem)
		var view = new View(elem);
		view.setVisibility(visibility);
		return view;
	}
	
	///Create empty view, which can be eventually opened or set as subview
	View.create = function() {
		var view = new View(document.createElement("toplevel-view"));
		return view;		
	}
	
	View.createFromTemplate = function(id, tempTag) {
		var t = loadTemplate(id, tempTag)
		return new View(t);
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

	///Lightbox style, mostly color and opacity
	View.lightbox_style = "background-color:black;opacity:0.25";
	///Lightbox class, if defined, style is ignored
	View.lightbox_class = "";
	
	
	return {
		"View":View,
		"loadTemplate":loadTemplate,
		"CustomElement":CustomElementEvents
	};
	
}();



