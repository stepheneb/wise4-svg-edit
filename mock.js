// minimal mocking-out of VLE dependencies in wise4-svg-edit
// Richard Klancer, 3/4/2010

// for references to 'steps', see
// http://confluence.concord.org/display/CSP/Notes+on+startup+sequence+of+WISE4-embedded+svg-edit

nodeId = "(standalone version of wise4-svg-edit)";
    
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
                return "";
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
                loadIconsAfterPageLoad();   
            }
        }
    };   
}());


(function () {
    var ajax = $.ajax;
    
    $.ajax = function(settings) {
        var error = settings.error;
        settings.error = function () {
            console.log("$.ajax error() callback called for url: " + settings.url);
            error();
        }        
        console.log("$.ajax called for url: " + settings.url);
        
        ajax(settings);
    };
}());


// mock out $.pref for line 2586 of svg-editor.js
$.pref = function(key, val) {
    console.log("calling $.pref with key: "+key+" val: "+val);
};
