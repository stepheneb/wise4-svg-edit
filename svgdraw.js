function SVGDRAW(node) {
	this.node = node;
	this.content = node.getContent().getContentJSON();
	
	this.svgCanvas = null;
	this.teacherAnnotation = "";		
	this.defaultImage = ""; // var to hold starting image
	this.stamps  =  []; // array to hold stamp paths
	this.snapshotsActive  =  false; // var to specify whether snapshots are active
	this.snapshots  =  []; // array to hold snapshot images
	this.descriptionActive =  false; // var to specify whether student annotation/description is active
	this.description  =  null; // var to hold annotation/description text
	this.defaultDescription = ""; //var to hold starting description text
	this.studentData = {
					"svgString": null,
					"description": null,
					"snapshots": null
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
			var images = data.stamps;
			for (var item in images) {
				//context.stamps.push(images[item].uri);
				context.stamps.push(images[item]);
			};
			context.snapshotsActive = data.snapshots_active;
			context.descriptionActive = data.description_active;
			context.defaultDescription = data.description_default;
			context.defaultImage = data.svg_text;				
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
		var data = null;
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
			context.svgCanvas.setSvgString(context.defaultImage);
		}
		
		context.initDisplay(data,context); // initiate stamps, description, snapshots
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
	//this.dataService.save(svgStringToSave);
	this.dataService.save(data);
};

SVGDRAW.prototype.load = function() {
	this.dataService.load(this, this.loadCallback);	
};

// populate stamp images, description/annotation text, and snapshots (wise4)
SVGDRAW.prototype.initDisplay = function(data,context) {
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
				$('#description_content').val(context.description); // populate note text
				// center panel in window
				var height = $('#descriptionpanel').height();
				var width = $('#descriptionpanel').width();
				$('#descriptionpanel').css({top: $(window).height()/2-height/2, left: $(window).width()/2-width/2});
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
		});
		
		$('#tool_description').attr("style","display:inline"); // show add description link
	}
	
	//initiate snapshots
	if(context.snapshotsActive){
		$('#tool_snapshot').attr("style","display:inline");
		
	}
	
	//initiate stamps
	if(context.stamps.length > 0){
		this.svgCanvas.setStampImages(context.stamps);
		var stamptxt = "";
		for (var i in context.stamps){
			var num = i*1 + 1;
			stamptxt += "<img id='" + i + "' class='tool_image' title='" + context.stamps[i].title + "' src=" + context.stamps[i].uri + " alt='Stamp " + num + "' height='" + context.stamps[i].height + "' width= '" + context.stamps[i].width + "'></div>";
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
};
	

//used to notify scriptloader that this script has finished loading
if(typeof eventManager != 'undefined'){
	eventManager.fire('scriptLoaded', 'vle/node/draw/svg-edit-2.4rc1/svgdraw.js');
};