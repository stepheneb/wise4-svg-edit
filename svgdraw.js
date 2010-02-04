function SVGDRAW(node) {
	this.node = node;
	this.content = node.getContent().getContentJSON();
	
	this.svgCanvas = null;
	this.teacherAnnotation = "";		
	this.defaultImage = ""; // svg string to hold starting (or background) svg image
	this.stamps  =  []; // array to hold stamp paths
	this.snapshotsActive  =  false; // boolean to specify whether snapshots are active
	this.snapshots  =  []; // array to hold snapshot images
	this.descriptionActive =  false; // boolean to specify whether student annotations/descriptions are active
	this.description  =  null; // string to hold annotation/description text
	this.defaultDescription = ""; // string to hold starting description text
	this.instructions = ""; // string to hold prompt/instructions text
	this.id = null; // var to hold currently selected snapshot id
	this.warningStackSize = 0;
	this.selected = false; // boolean to specify whether a snapshot is currently selected
	
	// json object to hold student data for the node
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
				context.addSnapshot(current,i,context); // add snap to snapshot panel
				// remove focus from all snapshots
				$('.snap').each(function(index){
					$(this).removeClass("hover active");
					$(this).children(".snap_delete").css("opacity",".5");
					$(this).children(".snap_num").css("opacity",".5");
				});
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
					context.openSnapshot(context.id,true,context);
					$(this).dialog('close');
				},
				Cancel: function() {
					$(this).dialog('close');
				}
			}
		});
		
		$('#deletesnap_dialog').dialog({
			bgiframe: true,
			resizable: false,
			modal: true,
			autoOpen:false,
			width:350,
			buttons: {
				'Yes': function() {
					context.snapshots.splice(context.id,1);
					$(".snap:eq(" + context.id + ")").fadeOut(1200, function(){$(this).remove()});
					$(this).dialog('close');
					setTimeout(function(){
			    		context.updateNumbers();
			    	},1500);
					context.id = -1; // This is a cludge to ensure that selecting undo doesn't result
			    	// in wrong snap being highlighted after deleting has occured
			    	// TODO: Fix me - Perhaps make snapshots array an object that holds snapshot svg,
			    	// creation id, and description text for each snapshot
				},
				Cancel: function() {
					$(this).dialog('close');
					$(".snap:eq(" + context.id + ")").click(function(){context.snapClick(this,context);}, 300);
				}
			}
		});
		
		// Bind snapshot playback controls
		$('img.snap_controls').click(function(){ context.snapPlayback($(this),context); });
		
		context.warningStackSize = 0; // set warning stack to 0 on intial load
		
		$("#svg_editor").mouseup(function(){ context.snapCheck(context); });  // bind mouseup events to stack checker function
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
	context.id = num;
};

SVGDRAW.prototype.addSnapshot = function(svgString,num,context) {
	context.warningStackSize = context.svgCanvas.getUndoStackSize();
	var res = context.svgCanvas.getResolution();
	var multiplier = 150/res.w;
	var snapHeight = res.h * multiplier;
	var snapWidth = 150;
	var snapNum = num*1 + 1;
	var snapHolder = '<div class="snap" title="Click to Open; Click and Drag to Reorder">' +
	'<div class="snap_wrapper"></div>' + 
	'<div class="snap_delete" title="Delete Snapshot"><span>X</span></div>' +
	'<div class="snap_num"><span>' + snapNum + '</span></div>'
	'</div>';
	$("#snap_images").append(snapHolder);
	
	// create snapshot thumb
	// TODO: Edit regex code to remove hard-coded width and height (600, 450)
	var snapshot = svgString.replace('<svg width="600" height="450"', '<svg width="' + snapWidth + '" height="' + snapHeight + '"');
	snapshot = snapshot.replace(/<g>/gi,'<g transform="scale(' + multiplier + ')">');
	var snapSvgXml = text2xml(snapshot);
	var $snap = $("div.snap:eq(" + num + ")");
	context.bindSnapshot($snap,context); // Bind snap thumbnail to click function that opens corresponding snapshot
	document.getElementsByClassName("snap_wrapper")[num].appendChild(document.importNode(snapSvgXml.documentElement, true)); // add snapshot thumb to snapshots panel
	context.updateClass(num,context);
};

// Open a snapshot as current drawing
SVGDRAW.prototype.openSnapshot = function(index,pulsate,context) {
	$('#svgcanvas').stop(true,true); // stop and remove any currently running animations
	var snap = context.snapshots[index];
	context.svgCanvas.setSvgString(snap);
	context.svgCanvas.setZoom(.75);
	// reset the undo/redo stack
	// clicking undo or redo too much (when in snpashot mode) eventually breaks the svg editor
	context.svgCanvas.resetUndo();
	context.warningStackSize = 0;
	$("#tool_undo").addClass("tool_button_disabled");
	if (pulsate==true){
		$('#svgcanvas').effect("pulsate", {times: '1'}, 700); // pulsate new canvas
	}
	context.updateClass(index,context);
	context.selected = true;
};

// Bind snapshot thumbnail to click function that opens corresponding snapshot, delete function, hover function, sorting function
SVGDRAW.prototype.bindSnapshot = function(item,context) {
	$(item).click(function(){context.snapClick(this,context);});
	
	$(item).hover(
		function () {
			if (!$(this).hasClass("active")){
				$(this).addClass('hover');
				$(this).children('.snap_delete').css("opacity",".75");
				$(this).children('.snap_num').css("opacity",".75");
			}
		}, 
		function () {
			if (!$(this).hasClass("active")){
				$(this).children('.snap_delete').css("opacity",".5");
				$(this).children('.snap_num').css("opacity",".5");
				$(this).removeClass('hover');
			}
		}
	);
	
	$(item).children(".snap_delete").click(function(){
		$(this).parent().unbind("click");
		var index = $("div.snap").index(item);
		context.id = index;
		$("#deletesnap_dialog").dialog('open');
	});
	
	// TODO: Make this sortable binder initiate only once (after first snapshot has been saved)
	$("#snap_images").sortable({
		start: function(event, ui) {
			context.id = $(".snap").index(ui.item);
			ui.item.unbind("click"); // unbind click function
	    },
	    stop: function(event, ui) {
	        setTimeout(function(){
	        	ui.item.click(function(){context.snapClick(this,context);}, 300); // rebind click function
	        });
	    },
	    update: function(event, ui) {
	    	var newIndex = $(".snap").index(ui.item);
	    	// reorder snapshots array
	    	var svgtext = context.snapshots.splice(context.id,1);
	    	context.snapshots.splice(newIndex,0,svgtext[0]);
	    	setTimeout(function(){
	    		context.updateNumbers();  // reorder snapshot thumbnail labels
	    	},400);
	    	context.id = -1; // This is a cludge to ensure that selecting undo doesn't result
	    	// in wrong snap being highlighted after reordering has occured
	    	// TODO: Fix me - Perhaps make snapshots array an object that holds snapshot svg,
	    	// creation id, and description text for each snapshot
	    },
	    opacity: .6,
	    placeholder: 'placeholder'
	});

};

SVGDRAW.prototype.snapClick = function(item,context){
	context.id = $("div.snap").index(item);
	//context.id = index;
	if(context.warningStackSize != context.svgCanvas.getUndoStackSize()){
		$('#snapwarning_dialog').dialog("open");
	} else {
		context.openSnapshot(context.id,true,context);
	}
};

SVGDRAW.prototype.updateClass = function(num,context){
	$(".snap").each(function(index){
		if(index != num){
			$(this).removeClass("hover active");
			$(this).children(".snap_delete").css("opacity",".5");
			$(this).children(".snap_num").css("opacity",".5");
		} else {
			$(this).addClass("hover active");
			$(this).children(".snap_delete").css("opacity","1");
			$(this).children(".snap_num").css("opacity","1");
		}
	});
};

SVGDRAW.prototype.snapCheck = function(context){
	setTimeout(function(){
		if(context.warningStackSize == context.svgCanvas.getUndoStackSize()){
			$current = $("div.snap:eq(" + context.id + ")");
			$current.addClass("hover active");
			$current.children(".snap_delete").css("opacity","1");
			$current.children(".snap_num").css("opacity","1");
		} else {
			$(".snap").each(function(index){
				if($(this).hasClass("active")){
					$(this).removeClass("hover active");
					$(this).children(".snap_delete").css("opacity",".5");
					$(this).children(".snap_num").css("opacity",".5");
				}
			});
			context.selected = false;
			//context.id = undefined;
		}
	}, 500);
	
};

SVGDRAW.prototype.snapPlayback = function($item,context){
	var mode = $item.attr('id');
	if(context.selected == true){
		var index = context.id;
	} else {
		index = 0;
	}
	if (mode=="play" && context.snapshots.length > 1){
		$('#play').hide();
		$('#previous').hide();
		$('#next').hide();
		$('#pause').attr("style","display:inline");
		$("#svgcanvas").everyTime(1000,'play',function(){
			context.openSnapshot(index,false,context);
			index = index+1;
			context.id = index-1;
			if(index > context.snapshots.length-1){
				index = 0;
				context.id = context.snapshots.length-1;
			}
		},0);
	} else if (mode=="pause") {
		$('#pause').hide();
		$('#play').attr("style","display:inline");
		$('#next').attr("style","display:inline");
		$('#previous').attr("style","display:inline");
		$("#svgcanvas").stopTime('play');
	}
};

SVGDRAW.prototype.updateNumbers = function(){
	$(".snap_num > span").each(function(index){
		var num = "" + (index*1 + 1);
		$(this).text(num);
	});
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