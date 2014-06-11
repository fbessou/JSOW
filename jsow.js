var widgets = [];
var zindex = 0;

function clamp(x,min,max)
{
	return Math.min(max,Math.max(min,x))
}

function WidgetManager(_parent)
{
	var that=this;
	this.widgets = {};
	this.currentFocus = false;
	this.parent = _parent;
	this.grabFocus = function(widget)
	{
		if(that.currentFocus != widget)
		{
			if(that.currentFocus)//reset last selected widget
			{
				that.currentFocus.header.style.background ="";
			}

			var event = new CustomEvent(
						"widgetfocused", 
							{
								detail: {focused: widget,
									 leaved : that.currentFocus},
								bubbles: true,
								cancelable: true
							}
					);
			document.dispatchEvent(event);
			that.currentFocus = widget;
			widget.mainNode.style.zIndex=++zindex;
			widget.mainNode.focus();
			widget.header.style.background= "url('images/headerfocus.png')";
			widget.mainNode.style.boxShadow = "";
		}
	};

	this.createWidget =function(name,opts,uniqueId)
	{
		if(typeof that.createWidget.idCounter == "undefined")
			that.createWidget.idCounter = 0;

		if(uniqueId == undefined)
			if( that.widgets[name] == undefined)
				uniqueId = name;
			else
				uniqueId = "IDLESS_"+that.createWidget.idCounter++;
		if(that.widgets[uniqueId]!=undefined)
		{
			alert("Can't make two windows with same name.");
			return false;
		}
		if(opts==undefined)
			opts={};

		var closable = opts.closable == undefined ? true: opts.closable;
		/* widget nodes creation*/
		var widnode = document.createElement("div");
		var headerNode = document.createElement("div");//Header Container
		var buttonsNode = document.createElement("div");
		var minimizeNode = document.createElement("div");// Minimize button
		var closeNode = document.createElement("div");// Minimize button
		var titleNode = document.createElement("div");//Title of the widget
		var contentNode = document.createElement("div");
		var sizeNode = document.createElement("div");
		/* classes attributions */
		widnode.className = "widget";
		headerNode.className = "widgetHeader";
		titleNode.className = "widgetTitle";
		buttonsNode.className = "headerButtons";
		minimizeNode.className = "widgetMinimize";
		if(closable)
			closeNode.className = "widgetClose";
		contentNode.className = "widgetContent" ; 
		sizeNode.className = "sizeHelper";
		/*binding and filling*/
		//closeNode.innerHTML = "x";
		titleNode.innerHTML = name;
		if(closable)
			buttonsNode.appendChild(closeNode);
		buttonsNode.appendChild(minimizeNode);
		headerNode.appendChild(buttonsNode);
		headerNode.appendChild(titleNode);
		contentNode.appendChild(sizeNode);
		if(opts.minWidth!=undefined)sizeNode.style.width=opts.minWidth;
		if(opts.minHeight!=undefined)sizeNode.style.height=opts.minHeight;

		if(opts.x!=undefined)widnode.style.left=opts.x;
		if(opts.y!=undefined)widnode.style.top=opts.y;

		widnode.appendChild(headerNode);
		widnode.appendChild(contentNode);
		if(that.parent == null)
			document.body.appendChild(widnode);
		else
			that.parent.appendChild(widnode);
		var theWidget = new Widget(widnode,opts,uniqueId)
			that.widgets[uniqueId] = theWidget;
		that.grabFocus(theWidget);
		return theWidget;
	};

}
WidgetMgr = new WidgetManager();

function Widget(elem,opts,uniqueId)
{
	this._id = uniqueId;
	if(opts==undefined)
		opts={};
	var that = this;
	//the node representing the whole widget
	this.mainNode = elem;
	this.minWidth = opts.minWidth || 50;
	this.minHeight = opts.minHeight || 10;
	this.maxWidth = opts.maxWidth || 5000;
	this.maxHeight = opts.maxHeight || 5000;
	this.ratio = opts.ratio == undefined ? -1 : opts.ratio;
	this.movable  = opts.movable == undefined ? true : opts.movable;
	this.closable = (typeof opts.closable == "undefined" ? true : opts.closable ) ;
	this.resizable = opts.resizable == undefined ? true: opts.resizable;
	this.smartResizing = opts.smartResizing == undefined ? false : opts.smartResizing;
	this.type = opts.type == undefined ? "UNDEF" : opts.type;
	this.data = opts.data == undefined ? {} : opts.data;

	//Start making the Widget DOM elements
	this.header = elem.querySelectorAll(".widgetHeader")[0];
	this.contentNode = elem.querySelectorAll(".widgetContent")[0];
	this.sizeHelper = this.contentNode.getElementsByClassName("sizeHelper")[0];
	this.contentHeight = this.contentNode.offsetHeight;
	this.contentMargin=10;
	this.headerHeight=20;
	this.visible = true;
	this._needSizeRefresh = false;
	// user defined functions
	if(this.closable)
		this.onclose =( typeof opts.onclose !== "function" ?  function(){return true;} : opts.onclose);
	this.getID = function(){return that._id;};
	this.setPosition = function(pos)
	{
		that.mainNode.style.left = pos.x;
		that.mainNode.style.top = pos.y;
	};
	this.add = function(elem)
	{
		if(elem.type === "custom" )
			that.sizeHelper.appendChild(elem.node);
		else
			that.sizeHelper.appendChild(elem);
		that.autoResize();
	};
	//clear the widget
	this.clear = function()
	{
		that.sizeHelper.innerHTML = "";
	};
	//called on widget drag
	function onDragStart(evt)
	{
		if(that.movable == false)
			return false;
		WidgetMgr.grabFocus(that);
		evt.preventDefault();
		that.mainNode.removeEventListener("mousemove",checkCursorPosition);
		//that.mainNode.style.opacity="0.8";

		function onDrag(e)
		{
			var pos = {};
			pos.x = clamp(e.pageX-that.dragOrigin.x,0,2000);
			pos.y = clamp(e.pageY-that.dragOrigin.y,0,2000);
			that.setPosition(pos);
		}
		function onDrop(e){
			if(that.mainNode.releaseCapture)
				that.mainNode.releaseCapture();
			document.removeEventListener("mousemove",onDrag);
			document.removeEventListener("mouseup",onDrop);
			that.mainNode.addEventListener("mousemove",checkCursorPosition);
			that.mainNode.style.cursor="default";
			that.mainNode.style.opacity="1";
		}

		if(that.mainNode.setCapture)
			that.mainNode.setCapture();
		document.addEventListener("mousemove",onDrag);
		document.addEventListener("mouseup",onDrop);

		that.dragOrigin = {x:evt.pageX-that.mainNode.offsetLeft,y:evt.pageY-that.mainNode.offsetTop};
		//notify user
		that.mainNode.style.cursor="move";
	}
	//magic resizing method
	this.autoResize= function()
	{
		if(that.visible == false)
		{
			this._needSizeRefresh = true;
			return;
		}
		var newWidth = that.contentNode.offsetWidth;
		var height = that.contentNode.offsetHeight;

		//that.contentNode.style.height = that.currentHeight = clamp(height,that.minHeight,that.maxHeight);
		that.sizeHelper.style.width = "";
		that.sizeHelper.style.height = "";
		that.contentNode.style.width = clamp(that.sizeHelper.offsetWidth,that.minWidth,that.maxWidth);
		that.contentNode.style.height = clamp(that.sizeHelper.offsetHeight,that.minHeight,that.maxHeight);
		that.sizeHelper.style.width = that.contentNode.offsetWidth;
		that.sizeHelper.style.height = that.contentNode.offsetHeight;
		that.contentHeight =  that.contentNode.offsetHeight;

	}
	//detect action to do
	this.resize = function(width,height)
	{
		var prrt = 0; //1 for vertical, 0 for horizontal
		that.contentNode.style.height = clamp(height,that.minHeight,that.maxHeight);
		that.contentNode.style.width = clamp(width,that.minWidth,that.maxWidth);
		that.sizeHelper.style.width = "";
		that.sizeHelper.style.height = "";
		if(that.sizeHelper.offsetWidth > that.contentNode.offsetWidth)
			that.contentNode.style.width = that.sizeHelper.offsetWidth;
		if(that.sizeHelper.offsetHeight > that.contentNode.offsetHeight)
			that.contentNode.style.height = that.sizeHelper.offsetHeight;
		if(prrt == 0)
		{
			that.sizeHelper.style.width = that.contentNode.offsetWidth;
			if(that.sizeHelper.offsetHeight > that.contentNode.offsetHeight)
				that.contentNode.style.height = that.sizeHelper.offsetHeight;
			that.sizeHelper.style.height = that.contentNode.offsetHeight;
		}
		else 
		{
			that.sizeHelper.style.height = that.contentNode.offsetHeight;
			if(that.sizeHelper.offsetWidth > that.contentNode.offsetWidth)
				that.contentNode.style.Width = that.sizeHelper.offsetWidth;
			that.sizeHelper.style.width = that.contentNode.offsetWidth;
		}

		that.contentHeight = that.contentNode.offsetHeight;
		if(that.smartResizing)
			that.autoResize();
	}
	function onMouseDown(e)
	{
		WidgetMgr.grabFocus(that); //put window in foreground

		function onResizeEnded(e){
			if(that.mainNode.releaseCapture)
				that.mainNode.releaseCapture();
			document.removeEventListener("mousemove",onResize);
			that.mainNode.addEventListener("mousemove",checkCursorPosition);
			that.mainNode.style.cursor="default";
			that.mainNode.style.opacity="1";
		}
		function onResize(e)
		{

			// retrieve the mouse position relative to page
			// and deduce new width and height of the widget
			var pos = {};
			pos.x = clamp(e.pageX,0,2000);
			pos.y = clamp(e.pageY,0,2000);

			// initialise new size with current size
			var newWidth = that.contentNode.offsetWidth;
			var newHeight = that.contentNode.offsetHeight;

			// change 
			if(that.resizeDir.h==1)
				newWidth = pos.x - that.mainNode.offsetLeft-2*that.contentMargin;
			if(that.resizeDir.v==1)
				newHeight = pos.y - that.mainNode.offsetTop-2*that.contentMargin-that.header.offsetHeight;
			that.resize(newWidth,newHeight);
		}

		if(that.resizeDir != undefined && (that.resizeDir.h !=0 || that.resizeDir.v != 0))
		{
			if(that.mainNode.setCapture)
				that.mainNode.setCapture();
			e.preventDefault();
			that.mainNode.removeEventListener("mousemove",checkCursorPosition);
			document.addEventListener("mousemove",onResize);
			document.addEventListener("mouseup",onResizeEnded);
			return false;
		}
	}

	function checkCursorPosition(evt)
	{
		var mousePos = {x:evt.pageX - that.mainNode.offsetLeft,y: evt.pageY - that.mainNode.offsetTop};
		if(that.resizable && that.visible)
		{
			var rightD = that.mainNode.offsetWidth - mousePos.x;
			var bottomD = that.mainNode.offsetHeight - mousePos.y;
			if(rightD<=that.contentMargin && mousePos.y > that.headerHeight)
			{
				if(bottomD<=that.contentMargin)
				{
					that.resizeDir = {h:1,v:1};
					that.mainNode.style.cursor="se-resize";
				}
				else
				{
					that.resizeDir = {h:1,v:0};
					that.mainNode.style.cursor="e-resize";
				}
			}
			else if(bottomD<=that.contentMargin)
			{
				that.resizeDir = {h:0,v:1};
				that.mainNode.style.cursor="s-resize";
			}
			else
			{
				that.resizeDir = {h:0,v:0};
				that.mainNode.style.cursor="default";
			}
		}
	}

	this.toggleHide = function(e)
	{
		that.visible= !that.visible;
		that.contentNode.style.visibility= that.visible==true ? "visible":"hidden";
		that.contentNode.style.height = that.visible ? that.contentHeight : 0;
		that.contentNode.style.marginTop = that.visible ? that.contentMargin + that.headerHeight: 0;
		that.contentNode.style.marginBottom = that.visible ? that.contentMargin : 0;
		that.header.style.borderRadius = that.visible ? "10px 10px 0 0" : "10px 10px 10px 10px  ";
		that.mainNode.style.borderRadius = that.visible ? "10px 10px 3px 3px" : "10px 10px 10px 10px  ";
		//that.header.style.borderBottom = that.visible ? "1px solid black" : "0px ";
		if(that.visible && that._needSizeRefresh )
		{
			that.autoResize();
			that._needSizeRefresh = false;
		}
	}
	if(this.resizable)
	{
		this.mainNode.style.backgroundImage = "url('images/mouse.png')";
	}
	this.header.addEventListener("mousedown",onDragStart);
	this.header.getElementsByClassName("widgetMinimize")[0].addEventListener("click",that.toggleHide);
	this.header.getElementsByClassName("widgetMinimize")[0].addEventListener("mousedown",function(e){e.stopPropagation()});
	this.mainNode.addEventListener("mousedown",onMouseDown);
	this.mainNode.addEventListener("mousemove",checkCursorPosition);
	this.mainNode.addEventListener("click",function(e){});
	if(that.closable)
	{
		this.mainNode.getElementsByClassName("widgetClose")[0].addEventListener("click",function(e){if(that.onclose())document.body.removeChild(that.mainNode);});
		this.mainNode.getElementsByClassName("widgetClose")[0].addEventListener("mousedown",function(e){e.stopPropagation()});
	}
	if(opts.position)
		this.setPosition(opts.position);
	else
		this.setPosition({x:0,y:0});
	if(opts.width || opts.height)
		this.resize(opts.width ? opts.width : that.contentNode.offsetWidth , opts.height ? opts.height : that.contentNode.offsetHeight);
}
Widget.prototype.getNode = function(){return this.sizeHelper;};
