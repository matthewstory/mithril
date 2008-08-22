/************************************
 * mithril.js
 *
 * harder faster better stronger
 * @author: Matthew Story
************************************/
var Mithril = {
	empty: function() {},
	browser: false,
	version: false,
	setup: function() {
		this.browser = (navigator.userAgent.match(/Opera/)) ? 'Opera':((navigator.userAgent.match(/MSIE/)) ? 'MSIE':((navigator.userAgent.match(/Safari/)) ? 'Safari':'Firefox'));
		this.version = navigator.userAgent.match(new RegExp(this.browser+'[^0-9]*([0-9]+\\.*[0-9]+)'))[1]/1;
	}
};
Mithril.setup();

//utility methods (generic)
function getBrowser() {return Mithril.browser;};
function getBrowserVersion() {return Mithril.version;};

//object utility methods
Object.prototype.patch = function() {
	for (var i=0;i<arguments.length;i++) {
		for (var name in arguments[i]) {
			this[name] = arguments[i][name];
		}
	}
	return this;
};
Object.prototype.patch({
	toJSON: function() {return this.toString().replace(/^\(new[^(]*\(|^\(|\)+$/g, '');},
	toArray: function() {
		var array = [];
		for (var i=0;i<this.length;i++) {
			array.push(this[i]);
		}
		return array;
	},
	//this will encode and send the object to a URL ajaxically
	send: function() {},
	encode: function() {},
	factory: function() {
		var options = {init: false, parent: Mithril.empty, initParent: false}.patch(arguments[0] || {});
		options.init = (options.init) ? ((options.init.constructor == String) ? this[options.init]:options.init):((this.init) ? this.init:this.initialize);
		//may want to wrap parent functions as: parent.call(this, args)
		var klass = function() {
			if (options.initParent) {
				this.parent.apply(this, arguments);
			}
			options.init.apply(this, arguments);
		};
		klass.prototype.patch(options.parent.prototype, this, {parent: options.parent});
		return klass;
	}
});

//string utility methods
String.prototype.patch({
	evalJSON: function() {return this.eval((arguments[0] || {}).patch({json: true}));},
	evalJS: function() {return this.eval((arguments[0] || {}).patch({json: false}));},
	eval: function() {
		var options = {onError: function() {}, json: false}.patch(arguments[0] || {});
		try {
			eval(((options.json) ? 'var jsonObj='+this:this));
			return (options.json) ? jsonObj:true;
		} catch(e) {
			options.onError(e);
			return false;
		}
	}
});

//array utility methods
Array.prototype.patch({
	inArray: function(value) {
		for (var i=0;i<this.length;i++) {
			if (this[i] == value) {
				return true;
			}
		}
		return false;
	},
	//takes an optional 2nd argument that will set the scope of (this) within func
	each: function(func){for(var i=0;i<this.length;i++){func.apply((arguments[1] || this), [this[i], i]);}},
	indexOf: function(elem) {
		for (var i=0; i < this.length; i++) {
			if (elem == this[i]) {
				return i;
			}
		}
		return -1;
	},
	remove: function(elem) {
		var index = this.indexOf(elem);
		if (index != -1) {
			this.splice(index, 1);
		}
	}
});

//function utility methods
Function.prototype.patch({
	bind: function(obj) {
		var func = this;
		return function() {
			func.apply(obj, arguments);
		};
	}
});

function $(id) {
	var element = (id.constructor == String) ? document.getElementById(id):id;
	if (element && !element.mithril) {
		element.patch = Object.prototype.patch;
		element.mithril = true;
		return element.patch((Event) ? Event.Element:{}, (Event.Advanced) ? Event.Advanced.Element:{}, (CSS) ? CSS.Element:{}, (DOM) ? DOM.Element:{}, (Ajax) ? Ajax.Element:{});
	}
	return element;
}

//Event Handling
var Event = {
	event: {
		init: function(event) {
			//make sure the developer has access to the event object . . . untouched
			//now we patch the event object for cross-browser use
			if (this.isKeyboardEvent(event)) {
				this.key = (event.which) ? String.fromCharCode(event.charCode):'k'+event.keyCode;
			}
			if (this.isMouseEvent(event)) {
				this.leftClick = (event.button === 0) ? true:false;
				this.centerClick = (event.button === 1) ? true:false;
				this.rightClick = (event.button === 2) ? true:false;
				this.mouse = (this.leftClick) ? LEFT_CLICK:(this.centerClick) ? CENTER_CLICK:RIGHT_CLICK;
			}
			event.stopPropagation = (event.stopPropagation || function() {this.cancelCapture = true; this.cancelBubble = true;});
		},
		isMouseEvent: function(event) {return ((event || this).type == 'click' || (event || this).type == 'mousedown' || (event || this).type == 'mouseup');},
		isKeyboardEvent: function(event) {return ((event || this).type == 'keypress' || (event || this).type == 'keydown' || (event || this).type == 'keyup');}
	}.factory(),
	//generic handling for events . . . Event here is used as a namespace
	events: [],
	listen: function(element, event, listener) {
		var wrap = this.wrapListener(listener.bind(element), arguments[3]);
		this.events.push({element: element, listener: listener, wrap: wrap, event: event});
		if (Mithril.browser == 'MSIE') {
			element.attachEvent('on'+event, wrap);
		} else {
			element.addEventListener(event, wrap, false);
		}
	},
	stopListening: function(element) {
		var listeners = this.getListeners(element, (arguments[1] || false), (arguments[2] || false));
		for (var i=0;i<listeners.length;i++) {
			if (Mithril.browser  == 'MSIE') {
				element.detachEvent('on'+listeners[1].event, listeners[i].wrap);
			} else {
				element.removeEventListener(listeners[i].event, listeners[i].wrap, false);
			}
		}
	},
	wrapListener: function(listener) {
		var options = new Event.Options(arguments[1]);
		return function(event) {
			//to patch window.event, we need to create an event object
			if (Mithril.browser == 'MSIE') {
				event = document.createEventObject().patch = Object.prototype.patch;
			}
			event = event.patch(new Event.event(event));
			if (!event || (
				(!event.isMouseEvent() || !options.keys.length || event.mouse == options.keys[0]) 
				&& ((!event.isKeyboardEvent()) || !options.keys.length || options.keys.inArray(event.key)) 
				&& (!options.masks.inArray(META) || event.metaKey) 
				&& (!options.masks.inArray(SHIFT) || event.shiftKey) 
				&& (!options.masks.inArray(CTRL) || event.ctrlKey) 
				&& (!options.masks.inArray(ALT) || event.altKey)
			)) {
				var userRet = listener(event);
				if (options.prevent) {
					event.stopPropagation();
					return false;
				}
				return userRet;
			}
		}
	},
	getListeners: function(element, event, listener) {
		var events = [];
		var matches = [];
		for (var i=0;i<this.events.length;i++) {
			if (element == this.events[i].element && (!event || this.events[i].event == event) && (!listener || this.events[i].listener == listener)) {
				matches.push(this.events[i]);
			} else {
				events.push(this.events[i]);
			}
		}
		this.events = events;
		return matches;
	},
	
	Options: {
		keys: [], masks: [], prevent: false,
		init: function() {
			this.patch(arguments[0] || {});
			this.keys = (this.keys.constructor == Array) ? this.keys:[this.keys];
			this.masks = (this.masks.constructor == Array) ? this.masks:[this.masks];
		}
	}.factory(),
	
	Advanced: {
		Element: {
            //specific listeners
            loadify: function(listener) {this.listen('load', listener, arguments[1]);},
            clickify: function(listener) {
                var options = new Event.Options(arguments[1]);
                if (options.keys.inArray(RIGHT_CLICK)) {
                    this.rightClickify(listener, options);
                    return;
                }
                this.listen('click', listener, options);
            },
            unclickify: function(listener) {this.stopListening('click', listener)},
            shiftClickify: function(listener) {this.clickify(listener, (arguments[1] || {}).patch({masks: SHIFT}));},
            ctrlClickify: function(listener) {this.clickify(listener, (arguments[1] || {}).patch({masks: CTRL}));},
            altClickify: function(listener) {this.clickify(listener, (arguments[1] || {}).patch({masks: ALT}));},
            metaClickify: function(listener) {this.clickify(listener, (arguments[1] || {}).patch({masks: META}));},
            rightClickify: function(listener) {
            this.listen('mousedown', listener, (arguments[1] || {}).patch({keys: RIGHT_CLICK}));
                if (arguments[1] && arguments[1].prevent) {
                    this.listen('contextmenu', function(event) {}, arguments[1]);
                }
            },
            unRightClickify: function(listener) {
                this.stopListening('mousedown', listener);
                this.stopListening('contextmenu');
            },
            keyPressify: function(keys, listener) {this.listen('keypress', listener, (arguments[2] || {}).patch({keys: keys}));},
            unKeyPressify: function(listener) {this.stopListening('keypress', listener);}
		}
	},
	
	Element: {
        listen: function(event, listener) {Event.listen(this, event, listener, arguments[2]);},
        //arguments[0] is event, arguments[1] is listener
        stopListening: function() {Event.stopListening(this, arguments[0], arguments[1]);}
	}
};

//CSS Extensions
var CSS = {
	Element: {
        hasClass: function(className) {
            return (this.className.match(new RegExp("(^|\\s+)"+className+"(\\s+|$)"))) ? true:false;
        },
        addClass: function(className) {
            this.className += " "+className;
        },
        removeClass: function(className) {
            this.className = this.className.replace(new RegExp("(^|\\s+)"+className+"(\\s+|$)", 'g'), '');
        },
        toggleClass: function(className) {
            (this.hasClass(className)) ? this.removeClass(className):this.addClass(className);
        }
	}
}

//DOM Extensions
var DOM = {
	Element: {
		childOf: function(element) {return this.parentNode == $(element);},
		parentOf: function(element) {return $(element).childOf(this);},
		siblingOf: function(element) {return $(element).childOf(this.parentNode);},
		descendantOf: function(element) {return (!this.parentNode) ? false:(this.childOf(element)) ? true:$(this.parentNode).descendantOf(element);},
		ancestorOf: function(element) {return $(element).descendantOf(this);},
		select: function(selector) {

		},
		getElementsBySelector: function(selector) {

		},
        //this borrows heavily from Sam Stephenson's prototype
        getElementsByClass: function(className) {
            var elements = this.getElementsByTagName("*");
            var keepers = [];
            for (var i=0;i<elements.length;i++) {
                if ($(elements[i]).hasClass(className)) {
                    keepers.push(elements[i]);
                }
            }
            return keepers;
        },
	}
};

//AJAX Handling
var Ajax = {
	Send: {
		init: function(url) {
			this.patch({method: 'POST', onCreate: Mithril.empty, onSetup: Mithril.empty, onSend: Mithril.empty, onLoading: Mithril.empty, onProgress: Mithril.empty, onComplete: Mithril.empty, onError: Mithril.empty}, arguments[1] || {});
			this.request = (Mithril.browser == 'MSIE' && Mithril.version != 7) ? new ActiveXObject("Microsoft.XMLHTTP"):new XMLHttpRequest();
			this.request.onreadystatechange = this.onReadyStateChange.bind(this);
			this.request.onprogress = this.onProgress;
		},
		onReadyStateChange: function() {
			this.wrap((this.request.readyState == 0) ? this.onCreate:(this.request.readyState == 1) ? this.onSetup:(this.request.readyState == 2) ? this.onSend:(this.request.readyState == 3) ? this.onLoading:(this.request.readyState == 4 && this.request.status == 200) ? this.onComplete:this.onError)(this.request);
		},
		wrap: function(handler) {
			return function() {
				try {
					handler.apply(this.request, arguments);
				} catch(e) {
					throw(e);
				}
			}
		}
	}.factory(),
	Element: {
        //this will perform an AJAX request and update the innerHTML
        update: function() {

        }
	}
};
//vars for keyCodes for non alpha numeric keystrokes -- they are prepended by 'k's to avoid any confusion with 0 - 9 when evaluated as a string
var BACKSPACE = 'k8';
var TAB = 'k9';
var ENTER = 'k13';
var SHIFT = 'k16';
var CTRL = 'k17';
var ALT = 'k18';
var META = 'META';
var PAUSE_BREAK = 'k19';
var CAPS = 'k20';
var ESC = 'k27';
var PAGE_UP = 'k33';
var PAGE_DOWN = 'k34';
var END = 'k35';
var HOME = 'k36';
var LEFT = 'k37';
var RIGHT = 'k39';
var UP = 'k38';
var DOWN = 'k40';
var INSERT = 'k45';
var DELETE = 'k46';
var NUM_0 = 'k96';
var NUM_1 = 'k97';
var NUM_2 = 'k98';
var NUM_3 = 'k99';
var NUM_4 = 'k100';
var NUM_5 = 'k101';
var NUM_6 = 'k102';
var NUM_7 = 'k103';
var NUM_8 = 'k104';
var NUM_9 = 'k105';
var F1 = 'k112';
var F2 = 'k113';
var F3 = 'k114';
var F4 = 'k115';
var F5 = 'k116';
var F6 = 'k117';
var F7 = 'k118';
var F8 = 'k119';
var F9 = 'k120';
var F10 = 'k121';
var F11 = 'k122';
var F12 = 'k123';
var NUM = 'k144';
var SCROLL = 'k145';

var LEFT_CLICK = 'left';
var RIGHT_CLICK = 'right';
var CENTER_CLICK = 'center';
