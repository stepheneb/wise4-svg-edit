function SVGDRAW(node) {
	this.node = node;
	this.content = node.getContent().getContentJSON();
	
	this.svgCanvas = null;
	this.teacherAnnotation = "";		
	this.defaultImage = ""; // svg string to hold starting image
	this.stamps  =  []; // array to hold stamp paths
	this.snapshotsActive  =  false; // boolean to specify whether snapshots are active
	this.snapshots  =  []; // array to hold snapshot images
	this.descriptionActive =  false; // boolean to specify whether student annotation/description is active
	this.description  =  null; // string to hold annotation/description text
	this.defaultDescription = ""; // string to hold starting description text
	this.instructions = ""; // string to hold prompt/instructions text
	this.id = null; // var to hold currently selected snapshot
	this.warningStackSize = 0;
	this.studentData = {
					"svgString": null,
					"description": null,
					"snapshots": []
					};
	this.init(node.getContent().getContentUrl());
}


SVGDRAW.prototype.init = function(jsonURL) {
	this.svgCanvas = svg_edit_setup(); // create new svg canvas
	put_locale(this.svgCanvas);
	this.loadModules(jsonURL, this);  // load the background and stamps
};


SVGDRAW.prototype.loadModules = function(jsonfilename, context) {
	
	$.getJSON(jsonfilename, 
		function(data){
			if(data.stamps){
				for (var item in data.stamps) {
					//context.stamps.push(images[item].uri);
					context.stamps.push(data.stamps[item]);
				};
			}
			
			if(data.snapshots_active){
				context.snapshotsActive = data.snapshots_active;
			}
			if(data.description_active){
				context.descriptionActive = data.description_active;
			}
			if(data.description_default) {
				context.defaultDescription = data.description_default;
			}
			if(data.prompt){
				context.instructions = data.prompt;
			}
			if(data.svg_background){
				context.defaultImage = data.svg_background;
			}				
			 var myDataService = new VleDS(vle);
		 	   // or var myDataService = new DSSService(read,write);
			 context.setDataService(myDataService);
			 context.load();   // load preview data, if any, or load default background
		}
	);
};


SVGDRAW.prototype.setDataService = function(dataService) {
	// register VLE Data Service to the svgCanvas object so that
	// it can save back to vle's persistence mechanism.
	// add a function to svgCanvas that will save the data to vle (wise4)
	this.dataService=dataService;
};


SVGDRAW.prototype.loadCallback = function(studentWorkJSON, context) {
		var annotationValue;
		// check for previous work and load it
		var svgString;
		if (studentWorkJSON){
			try{
				svgString = studentWorkJSON.svgString;
			} catch(err) {
				svgString = studentWorkJSON;
			}
			context.svgCanvas.setSvgString(svgString);

			//check if annotations were retrieved
			if(context.dataService.vle.annotations != null) {
				//see if there were any annotations for this step
				var annotation = context.dataService.vle.annotations.getLatestAnnotationForNodeId(context.dataService.vle.getCurrentNode().id);
				if (annotation != null) {
					var annotationValue = annotation.value;
					//annotationValue = '<g><title>teacher</title><text xml:space="preserve" text-anchor="middle" font-family="serif" font-size="24" stroke-width="0" stroke="#000000" fill="#000000" id="svg_3" y="55.5" x="103">annotation</text></g>';
					this.teacherAnnotation = annotationValue;
					context.svgCanvas.setSvgString(svgString.replace("</svg>", this.teacherAnnotation + "</svg>"));
					context.svgCanvas.setCurrentLayer('Layer 1');
				}
			}

			var processGetDrawAnnotationResponse = function(responseText, responseXML) {
				//parse the xml annotations object that contains all the annotations
				var annotation = annotations.getLatestAnnotationForNodeId(context.dataService.vle.getCurrentNode().id);
				vle.annotations;
				var annotationValue = annotation.value;
				//annotationValue = '<g><title>teacher</title><text xml:space="preserve" text-anchor="middle" font-family="serif" font-size="24" stroke-width="0" stroke="#000000" fill="#000000" id="svg_3" y="55.5" x="103">annotation</text></g>';
				context.svgCanvas.setSvgString(svgString.replace("</svg>", annotationValue + "</svg>"));
				context.svgCanvas.setCurrentLayer('Layer 1');
			};
			//context.dataService.vle.connectionManager.request('GET', 3, 'http://localhost:8080/vlewrapper/vle/echo.html', {}, processGetDrawAnnotationResponse);
			
			var getAnnotationsParams = {
											runId: context.dataService.vle.getConfig().getConfigParam('runId'),
											toWorkgroup: context.dataService.vle.getUserAndClassInfo().getWorkgroupId(),
											fromWorkgroup: context.dataService.vle.getUserAndClassInfo().getTeacherWorkgroupId(),
											periodId: context.dataService.vle.getUserAndClassInfo().getPeriodId()
									   };
			
			//get all the annotations (TODO: uncomment when using webapp/portal)
			//context.dataService.vle.connectionManager.request('GET', 3, context.dataService.vle.getConfig().getConfigParam('getAnnotationsUrl'), getAnnotationsParams, processGetDrawAnnotationResponse);
		} else if (context.defaultImage){ // if no previous work, load default (starting) drawing
			var svgString = context.defaultImage.replace("</svg>", "<g><title>student</title></g></svg>"); // add blank student layer
			context.svgCanvas.setSvgString(svgString);
		}
		
		context.initDisplay(studentWorkJSON,context); // initiate stamps, description, snapshots
};

SVGDRAW.prototype.saveToVLE = function() {
	//var svgStringToSave = this.svgCanvas.getSvgString();
	// strip out annotations
	if (this.teacherAnnotation != "") {
		svgStringToSave = svgStringToSave.replace(this.teacherAnnotation, "");
	}
	this.studentData.svgString = this.svgCanvas.getSvgString();
	this.studentData.description = this.description;
	this.studentData.snapshots = this.snapshots;
	var data = this.studentData;
	this.dataService.save(data);
};

SVGDRAW.prototype.load = function() {
	this.dataService.load(this, this.loadCallback);	
};

// populate instructions, stamp images, description/annotation text, and snapshots (wise4)
SVGDRAW.prototype.initDisplay = function(data,context) {
	// initiate prompt/instructions
	if(context.instructions != ""){
		$('#prompt_text').html(context.instructions);
		
		$('#prompt_dialog').dialog({
			bgiframe: true,
			resizable: false,
			modal: true,
			autoOpen:false,
			width:400,
			buttons: {
				'OK': function() {
					$(this).dialog('close');
				}
			}
		});

		$('#tool_prompt').click(function(){
			$('#prompt_dialog').dialog('open');
		});
		
		$('#tool_prompt').attr("style","display:inline");
		
		if(!vle.getLatestStateForCurrentNode()){
			$('#prompt_dialog').dialog('open');
		}
	}
	
	// initiate description/annotation
	if(context.descriptionActive){
		// TODO: add vle check for saved description logic
		if (data){
			context.description = data.description;
		} else if (context.defaultDescription){
			context.description = context.defaultDescription;
		}
		
		// Show description panel on link click
		$('.tool_description').click(function(){
			if (!$('#descriptionpanel').is(':visible')){ // prevent text from being overridden if panel is already visible
				$('#description_commit').attr("disabled", "disabled");
				$('#description_close').attr("disabled", "disabled");
				$('#description_content').val(context.description); // populate description text
				// center description panel in window
				var height = $('#descriptionpanel').height();
				var width = $('#descriptionpanel').width();
				$('#descriptionpanel').css({top: $(window).height()/2-height/2, left: $(window).width()/2-width/2});
				$("#overlay").show();
				$('#descriptionpanel').show(); // show description panel
			}
		});
		
		// Save description text
		$('#description_commit').click(function(){
			var value = $('#description_content').val();
			context.description = value;
			$(this).attr("disabled", "disabled");
			context.saveToVLE(); // save changes to VLE
		});
		
		// Save description text and close dialogue
		$('#description_close').click(function(){
			var value = $('#description_content').val();
			context.description = value;
			$('#descriptionpanel').hide();
			$("#overlay").hide();
			context.saveToVLE(); // save changes to VLE
			// TODO: add logic to check whether save button has been clicked already
			// If it has, no need to resave the data to the vle
		});
		
		$('#description_content').keyup(function(){
			$('#description_commit').removeAttr("disabled");
			$('#description_close').removeAttr("disabled");
		});
		
		$('#close_description').click(function(){
			$('#descriptionpanel').hide();
			$("#overlay").hide();
		});
		
		$('#tool_description').attr("style","display:inline"); // show add description link
	}
	
	//initiate snapshots
	if(context.snapshotsActive){
		$('#tool_snapshot').attr("style","display:inline");
		
		if(data.snapshots){
			for (var i in data.snapshots) {
				context.snapshots.push(data.snapshots[i]);
				var current = context.snapshots[i];
				context.addSnapshot(current,i,context);
			};
		}
		
		$('#new_snap_dialog').dialog({
			bgiframe: true,
			resizable: false,
			modal: true,
			autoOpen:false,
			buttons: {
				'Yes': function() {
					context.newSnapshot(context);
					$(this).dialog('close');
				},
				Cancel: function() {
					$(this).dialog('close');
				}
			}
		});

		$('.snapshot_new').click(function(){
			$('#new_snap_dialog').dialog('open');
		});
		
		$('#snapwarning_dialog').dialog({
			bgiframe: true,
			resizable: false,
			modal: true,
			autoOpen:false,
			width:490,
			buttons: {
				'Continue': function() {
					context.openSnapshot(context.id);
					$(this).dialog('close');
				},
				Cancel: function() {
					$(this).dialog('close');
				}
			}
		});
		context.warningStackSize = 0;
	}
	
	//initiate stamps
	if(context.stamps.length > 0){
		this.svgCanvas.setStampImages(context.stamps);
		var stamptxt = "";
		for (var i in context.stamps){
			var num = i*1 + 1;
			//stamptxt += "<img id='" + i + "' class='tool_image' title='" + context.stamps[i].title + "' src=" + context.stamps[i].uri + " alt='Stamp " + num + "' height='" + height + "' width= '" + width + "'></div>";
			// max stamp preview image height and width are hard-coded in css now (max 50px)
			stamptxt += "<img id='" + i + "' class='tool_image' title='" + context.stamps[i].title + "' src=" + context.stamps[i].uri + " alt='Stamp " + num + "'></div>";
		}
		$('#tools_stamps').append(stamptxt);
		// set first image as default (selected)
		this.svgCanvas.setStamp(0);
		$("#tools_stamps > #0").addClass("tool_image_current");
		
		// bind click event to set selected stamp image (wise4)
		$('.tool_image').click(function(){
			var id = $(this).attr('id');
			context.svgCanvas.setStamp(id);
			$('.tool_image').each(function(i){
				if ($(this).attr("id") == id) {
					$(this).addClass("tool_image_current");
				} else {$(this).removeClass("tool_image_current");};
			});
			$('#tools_stamps').fadeOut("slow");
		});
		//$('#tool_image').show(); // show stamp tool button
	} else {
		$('#tool_image').hide(); // if no stamps are defined, hide stamp tool button
	}
	
	// reset undo stack
	this.svgCanvas.resetUndo();
	$("#tool_undo").addClass("tool_button_disabled");
};

SVGDRAW.prototype.newSnapshot = function(context) {
	var current = context.svgCanvas.getSvgString();
	context.snapshots.push(current);
	context.saveToVLE();
	var num = context.snapshots.length-1;
	//var snapID = "snap" + num;
	context.addSnapshot(current,num,context);
	$("#snap_images").attr({ scrollTop: $("#snap_images").attr("scrollHeight") });
	$(".snap:eq(" + num + ")").effect("pulsate", { times:1 }, 800);
	context.warningStackSize = context.svgCanvas.getUndoStackSize();
};

SVGDRAW.prototype.addSnapshot = function(svgString,num,context) {
	context.warningStackSize = context.svgCanvas.getUndoStackSize();
	var res = context.svgCanvas.getResolution();
	var multiplier = 150/res.w;
	var snapHeight = res.h * multiplier;
	var snapWidth = 150;
	var snapHolder = '<div class="snap" title="Click to Open">' +
	'<div class="snap_delete" title="Delete Snapshot">Delete X</div></div>';
	$("#snap_images").append(snapHolder);
	
	// create snapshot thumb
	// TODO: Edit regex code to remove hard-coded width and height (600, 450)
	var snapshot = svgString.replace('<svg width="600" height="450"', '<svg width="' + snapWidth + '" height="' + snapHeight + '"');
	snapshot = snapshot.replace(/<g>/gi,'<g transform="scale(' + multiplier + ')">');
	var snapSvgXml = text2xml(snapshot);
	var $snap = $("div.snap:eq(" + num + ")");
	context.bindSnapshot($snap,context); // Bind snap thumbnail to click function that opens corresponding snapshot
	document.getElementsByClassName("snap")[num].appendChild(document.importNode(snapSvgXml.documentElement, true)); // add snapshot thumb to snapshots panel
};

// Open a snapshot as current drawing
SVGDRAW.prototype.openSnapshot = function(id) {
	var snap = this.snapshots[id];
	this.svgCanvas.setSvgString(snap);
	this.svgCanvas.setZoom(.75);
	// reset the undo/redo stack
	// clicking undo or redo too much (when in snpashot mode) eventually breaks the svg editor
	this.svgCanvas.resetUndo();
	this.warningStackSize = 0;
	$("#tool_undo").addClass("tool_button_disabled");
	$('#svgcanvas').effect("pulsate", { times:1 }, 700); // pulsate new snapshot
};

// Bind snapshot thumbnail to click function that opens corresponding snapshot
SVGDRAW.prototype.bindSnapshot = function(item,context) {
	var snapClick = function(item){
	//$(item).click(function(){
		var index = $("div.snap").index(item);
		context.id = index;
		if(context.warningStackSize != context.svgCanvas.getUndoStackSize()){
			$('#snapwarning_dialog').dialog("open");
		} else {
			context.openSnapshot(index);
		}
	};
	
	$(item).click(function(){snapClick(this);});
	
	$("#snap_images").sortable({
		start: function(event, ui) {
			context.id = $("div.snap").index(ui.item);
			ui.item.unbind("click");
	    },
	    stop: function(event, ui) {
	        setTimeout(function(){
	        	ui.item.click(function(){snapClick(this);}, 300);
	        });
	    },
	    update: function(event, ui) {
	    	var newIndex = $("div.snap").index(ui.item);
	    	var svgtext = context.snapshots.splice(context.id,1);
	    	context.snapshots.splice(newIndex,0,svgtext[0]);
	    },
	    opacity: .6,
	    placeholder: 'placeholder'
	});
	
	$(item).hover(
		function () {
			$(this).addClass('hover');
			$(this).children('.snap_delete').css("opacity","1");
		}, 
		function () {
			$(this).children('.snap_delete').css("opacity",".3");
			$(this).removeClass('hover');
		}
	);

};

// from svg-edit code (svgcanvas.js), converts text to xml (svg xml)
//found this function http://groups.google.com/group/jquery-dev/browse_thread/thread/c6d11387c580a77f
var text2xml = function(sXML) {
	// NOTE: I'd like to use jQuery for this, but jQuery makes all tags uppercase
	//return $(xml)[0];
	var out;
	try{
		var dXML = ($.browser.msie)?new ActiveXObject("Microsoft.XMLDOM"):new DOMParser();
		dXML.async = false;
	} catch(e){ 
		throw new Error("XML Parser could not be instantiated"); 
	};
	try{
		if($.browser.msie) out = (dXML.loadXML(sXML))?dXML:false;
		else out = dXML.parseFromString(sXML, "text/xml");
	}
	catch(e){ throw new Error("Error parsing XML string"); };
	return out;
};

//used to notify scriptloader that this script has finished loading
if(typeof eventManager != 'undefined'){
	eventManager.fire('scriptLoaded', 'vle/node/draw/svg-edit-2.4rc1/svgdraw.js');
};