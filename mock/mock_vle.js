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
                // mock out this JSON
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
        loadScripts: function (name, window, nodeId, eventManager) {
            // mock for steps 4-7
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
            selected: -1,
            snapTotal: 1,
            snapshots: [{
                id: 1,
                svg: '<svg width="600" height="450" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">  <g>  <title>Layer 1</title>  <rect x="102.5" y="57" width="92" height="116" id="svg_1" fill="#FF0000" stroke="#000000" stroke-width="5"/>  </g> </svg>'
            }],
            svgString: '<svg width="600" height="450" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">  <g>  <title>Layer 1</title>  <rect stroke-width="5" stroke="#000000" fill="#FF0000" id="svg_2" height="147" width="147" y="109.5" x="231"/> </g> </svg>'
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

// fixes for possible circular dependencies: methods called by self-executing function in svg-editor.js before objects
// are defined in svg_edit_setup() (also in svg-editor.js)

// mock out $.pref for line 2586 of svg-editor.js
$.pref = function(key, val) {
    var undefined;

    console.log("$.pref called with key: " + key + " val: " + val + " before being (re)defined.");
    
    if (key=='iconsize' && val==undefined) {
        return('m');
    }
};

// $.svgCanvas for line 2591 of svg-editor.js

var svgCanvas = {
    setIconSize: function (size) {
        console.log("svgCanvas.setIconSize called with argument: " + size + " before being (re)defined.");
    }
};
