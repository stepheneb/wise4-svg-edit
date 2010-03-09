// minimal mocking-out of VLE dependencies in wise4-svg-edit
// Richard Klancer, 3/4/2010

// for references to 'steps', see
// http://confluence.concord.org/display/CSP/Notes+on+startup+sequence+of+WISE4-embedded+svg-edit

nodeId = "(standalone version of wise4-svg-edit)";

if (!console) {
    // "console = console || ..." notation doesn't work as console is a property with no setter
    console = { log: function () {} };
}

var node = {
    contentPanel: {
        window: window
    },
    
    id: nodeId,
    
    getContent: function () {
        return {
            getContentJSON: function () {
                // mock out this JSON?
                console.log("node.getContent().getContentJSON() called.")
                return "";
            },
            
            getContentUrl: function () {
                // mock out this URL
                // the url returned here will be passed to $.getJSON in SVGDRAW.prototype.loadModules 
                // (see line 56, svgdraw.js)
                return "mock/mock_node_config.json";
            }
        };
    }
};


var eventManager = {
    fire: function (ev, arg) {
       // mock for steps 1-2
       if (ev == "pageRenderComplete") {
           node.id = arg;
           loadContent(node);
       }
       else if (ev == 'scriptLoaded') {
           console.log("scriptLoaded event: " + arg);
           scriptloader.scriptLoaded(arg);
       }    
    }
};


var scriptloader = (function () {

    var urls = [
        { url: 'svg-editor.js', loaded: false },
        { url: 'svgdraw.js', loaded: false },
        { url: 'svgcanvas.js', loaded: false },
        { url: 'svgdrawstate.js', loaded: false }      
    ];
    
    var loadScript = function (url) {
        var script = document.createElement("script");
        script.type="text/javascript";
        script.src = url;
        document.getElementsByTagName('head')[0].appendChild(script);
    };
    
    var loadNextUnloadedScript = function () {
        for (var i = 0; i < urls.length; i++) {
            if (!urls[i].loaded) {
                loadScript(urls[i].url);
                return;
            }
        }
    };
    
    var markScriptLoaded = function (scriptUrl) {
        for (var i = 0; i < urls.length; i++) {
            if (urls[i].url ==  scriptUrl) {
                urls[i].loaded = true;
                return;
            }
        }
        
        console.log("A script '" + scriptUrl + "' fired a scriptLoaded event, but is not on mock.js' url list");
    };
    
    var allScriptsAreLoaded = function () {
        for (var i = 0; i < urls.length; i++) {
            if (!urls[i].loaded) {
                return false;
            }
        }
        return true;
    };
    
    return {
        // mock for steps 4-7
        loadScripts: function (name, window, nodeId, eventManager) {
            if (name == "svgdraw") {
                loadNextUnloadedScript();
            }
        },
    
        scriptLoaded: function(scriptUrl) {
            markScriptLoaded(scriptUrl);
            loadNextUnloadedScript();
            if (allScriptsAreLoaded()) {
                // notify the svg-edit component that all scripts are loaded
                loadContentAfterScriptsLoad(node);  
            }
        }
    };   
}());


var vle = {
    annotations: null,
    
    getConfig: function () {
        return {
            getConfigParam: function (arg) {
                console.log("vle.getConfig().getConfigParam() called with argument: " + arg);
                if (arg=='mode') {
                    return 'run';
                }
            }
        };
    },    
    
    getUserAndClassInfo: function () {
        return {
            getWorkgroupId: function () {},
            getTeacherWorkgroupId: function () {},
            getPeriodId: function () {}
        };
    },
    
    
    getCurrentNode: function () {
    },
    
    getLatestStateForCurrentNode: function () {
        return {
            description: "A page.",
            selected: 0,
            snapTotal: 3,
            
            snapshots: [{
                    id: 0,
                    svg: '<svg width="600" height="450" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">  <g> <title>Layer 1</title>  <circle stroke-width="5" stroke="rgb(127, 0, 0)" fill="rgb(255, 212, 170)" id="svg_2" r="33.9043" cy="163.33353" cx="79.33308"/>  <rect stroke-width="5" stroke="rgb(127, 0, 0)" fill="rgb(255, 212, 170)" id="svg_4" height="70.66667" width="70.66667" y="236.00001" x="45.33335"/>  </g> </svg>'
                }, {   
                    id: 1,
                    svg: '<svg width="600" height="450" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">  <g>  <title>Layer 1</title>  <circle cx="284.66642" cy="78.00019" r="33.9043" id="svg_2" fill="rgb(255, 212, 170)" stroke="rgb(127, 0, 0)" stroke-width="5"/>  <rect x="249.33334" y="237.33334" width="70.66667" height="70.66667" id="svg_4" fill="rgb(255, 212, 170)" stroke="rgb(127, 0, 0)" stroke-width="5"/> </g> </svg>'
                }, {   
                    id: 2,
                    svg: '<svg width="600" height="450" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">  <g>  <title>Layer 1</title>  <circle cx="517.99975" cy="164.66686" r="33.9043" id="svg_2" fill="rgb(255, 212, 170)" stroke="rgb(127, 0, 0)" stroke-width="5"/>  <rect x="484" y="237.33334" width="70.66667" height="70.66667" id="svg_4" fill="rgb(255, 212, 170)" stroke="rgb(127, 0, 0)" stroke-width="5"/> </g> </svg>'
                }],
            svgString: '<svg width="600" height="450" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">  <g>  <title>Layer 1</title>  </g> </svg>'
        };
    },
  
    saveState: function () {
    }
};


(function () {
    var ajax = $.ajax;
    
    $.ajax = function(settings) {
        var error = settings.error || function () {};
        settings.error = function () {
            console.log("$.ajax error() callback called for url: " + settings.url);
            error();
        }        
        console.log("$.ajax called for url: " + settings.url);
        
        ajax(settings);
    };
}());

// fixes for possible circular dependencies: methods called by immediately self-executing function in svg-editor.js
// before the corresponding objects are defined (also in svg-editor.js, but in a function called strictly after load.)

// mock out $.pref for line 2586 of svg-editor.js
$.pref = function(key, val) {
    var undefined;

    console.log("$.pref called with key: " + key + " val: " + val + " before being (re)defined.");
    
    if (key=='iconsize' && val==undefined) {
        return('m');
    }
};

// mock out $.svgCanvas for line 2591 of svg-editor.js
var svgCanvas = {
    setIconSize: function (size) {
        console.log("svgCanvas.setIconSize called with argument: " + size + " before being (re)defined.");
    }
};
