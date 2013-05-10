/* Copyright (c) 2012 The Tagspaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that 
 * can be found in the LICENSE file. */
define(function(require, exports, module) {
"use strict";
    
	console.debug("Loading fileOpener...");
	
	var TSCORE = require("tscore");

	var _openedFilePath = undefined; 
	
	var _isFileOpened = false;	

	var _tsEditor = undefined;
	
	// If a file is currently opened for editing, this var should be true
	var _isEditMode = false;	

	function isFileEdited() {
		return _isEditMode;
	}	
	
	function isFileOpened() {
		return _isFileOpened;
	}	

	function setFileOpened(fileOpened) {
		_isFileOpened = fileOpened;
	}
	
	function getOpenedFilePath() {
		return _openedFilePath;
	}

	function openFile(filePath) {
	    console.debug("Opening file: "+filePath);
		
		if(TSCORE.FileOpener.isFileEdited()) {
			if(!confirm("Any unsaved changes will be lost! \nDo you want to continue?")) {
				return false;
			}
		}
		
	    _isEditMode = false;
	
	    _openedFilePath = filePath;    
	    $("#selectedFilePath").val(_openedFilePath.replace("\\\\","\\")); 
	    
	    var fileExt = TSCORE.TagUtils.extractFileExtension(filePath);
	
	    constructFileViewerUI(filePath);         
	
	    // Getting the viewer for the file extension/type
	    var viewerExt = TSCORE.Config.getFileTypeViewer(fileExt);  
	    console.debug("File Viewer: "+viewerExt);
	
	    initTagSuggestionMenu(filePath);
	
	    $( "#viewer" ).empty();
	    if(!viewerExt) {
	        $( "#viewer" ).text("File type not supported for viewing.");        
	    } else if (viewerExt == "viewerBrowser") {
		    filePath = "file:///"+filePath;
		    $('#viewer').append($('<iframe>', {
		    	id: "iframeViewer",
				src: filePath
		    }));    	
	    } else {
	        require([TSCORE.Config.getExtensionPath()+"/"+viewerExt+"/"+"extension.js"], function(viewer) {
	            _tsEditor = viewer;
	            _tsEditor.init(filePath, "viewer");
	            _tsEditor.viewerMode(true);
	        });
	    } 
	    TSCORE.FileOpener.setFileOpened(true); 
		TSCORE.openFileViewer();
	} 
	
	function updateEditorContent(fileContent) {
	    console.debug("Updating editor"); // with data: "+fileContent); 
	    _tsEditor.setContent(fileContent);    
	}
	
	// Should return false if no editor found
	function getFileEditor(filePath) {
	    var fileExt = TSCORE.TagUtils.extractFileExtension(filePath);
	
	    // Getting the editor for the file extension/type
	    var editorExt = TSCORE.Config.getFileTypeEditor(fileExt);  
	    console.debug("File Editor: "+editorExt);
	    return editorExt;    
	}
	
	function editFile(filePath) {
	    console.debug("Editing file: "+filePath);
	
	    var editorExt = getFileEditor(filePath);
	    
	    $( "#viewer" ).empty();
	    if(editorExt === false) {
	        $( "#viewer" ).text("File type not supported for editing.");        
	        return;
	    } else {
	        try {
	            require([TSCORE.Config.getExtensionPath()+"/"+editorExt+"/extension.js"], function(editr) {
	                _tsEditor = editr;
	                _tsEditor.init(filePath, "viewer");
	            });
	            _isEditMode = true;
	        } catch(ex) {
	            console.error("Loading editing extension failed: "+ex);
	        }
	    }   
	} 
	
	function saveFile(filePath) {
	    console.debug("Save current file: "+filePath);
	    var content = _tsEditor.getContent();
	    TSCORE.IO.saveTextFile(filePath, content);   	    	
	}
	
	function constructFileViewerUI(filePath) {
	    // Adding tag buttons to the filetoolbox
	    var tags = TSCORE.TagUtils.extractTags(filePath);
	    
	    var title = TSCORE.TagUtils.extractTitle(filePath);
		
		$("#fileTitle").unbind('.editInPlace');
		$("#fileTitle").data('editInPlace',false);
	
	    $( "#fileTitle" ).text(title);
	    
	    $( "#fileTitle" ).editInPlace({
			callback: function(unused, newTitle) { TSCORE.TagUtils.changeTitle(filePath,newTitle); },
    		show_buttons: false,
    		callback_skip_dom_reset: true
		});	    
	    
	    // Generate tag buttons
	    $( "#fileTags" ).empty();
	    for (var i=0; i < tags.length; i++) {
	        $( "#fileTags" ).append($("<button>", { 
	            "class":  "btn btn-small btn-success tagButton", 
	            tag: tags[i], 
	            filepath: filePath, 
	            title: "Opens context menu for "+tags[i],
	            text: tags[i] 
	            })
	            .append($("<span>", { class: "caret"}))
	            );            
	    };    
	    
	    $( "#tagsContainer" ).droppable({
	    	accept: ".tagButton",
	    	hoverClass: "activeRow",
	    	drop: function( event, ui ) {
	    		var tagName = ui.draggable.attr("tag");
				console.log("Tagging file: "+tagName+" to "+filePath);
				TSCORE.TagUtils.addTag([filePath], [tagName]);
	    	}	            	
	    })
	
	    // Activate tagButtons in file view
	    $('.tagButton', $( "#fileTags" ))
	        .click( function() {
	            TSCORE.openTagMenu(this, $(this).attr("tag"), $(this).attr("filepath"));
	        })
	        .dropdown( 'attach' , '#tagMenu' );   
	    
	    // Clear filetoolbox
	    $( "#filetoolbox" ).empty();
	    
	    $( "#selectedFilePath" ).click(function() {
			this.select();
	    });
	    
	    addPrevButton("#filetoolbox");
	    addNextButton("#filetoolbox");
	    addTagSuggestionButton("#filetoolbox");
	    addCloseButton("#filetoolbox");     

		//TODO Add to dropdown
	    addFullScreenButton("#filetoolbox");
	    addOpenInWindowButton("#filetoolbox", filePath);
	    addEditButton("#filetoolbox", filePath);
		addShowFullDetailsButton("#filetoolbox");
	}
	
	function initTagSuggestionMenu(filePath) {
	    var tags = TSCORE.TagUtils.extractTags(filePath);
	
	    var suggTags = TSCORE.TagUtils.suggestTags(filePath);
	
	    var tsMenu = $( "#tagSuggestionsMenu" );
	
	    $( "#tagSuggestionsMenu" ).empty(); 
	
		var suggestionMenuEmpty = true;
	
	    // Adding context menu entries for creating tags according to the suggested tags
	    for (var i=0; i < suggTags.length; i++) {        
	        // Ignoring the tags already assigned to a file
	        if(tags.indexOf(suggTags[i]) < 0) {
	            $( "#tagSuggestionsMenu" ).append($('<li>', {name: suggTags[i]}).append($('<a>', { 
	                href: "javascript:void(0);",
	                title: "Add tag "+suggTags[i]+" to current file", 
					tagname: suggTags[i],
					filepath: filePath,
	                text: "Tag with '"+suggTags[i]+"'" 
	                })
	                .click(function() {
			            var tagName = $(this).attr( "tagname" );    
			            var filePath = $(this).attr( "filepath" );    		            
			            console.debug("Tag suggestion clicked: "+tagName);
			            TSCORE.TagUtils.writeTagsToFile(filePath, [tagName]);
			          	return false;
	        		})                
	               ));              
	             suggestionMenuEmpty = false; 
	        }         
	    };    
	
		// Showing dropdown menu only if the context menus is not empty
		if(!suggestionMenuEmpty) {
	    	$( "#openTagSuggestionMenu" ).dropdown( 'attach' , '#tagSuggestionsMenu' );		
		}
	}
	
	function addTagSuggestionButton(container) {
	    $( ""+container ).append('<button id="openTagSuggestionMenu" class="btn btn-small" title="Tag Suggestions"><i class="icon-tags"></i></button>');
	}
	
	function addNextButton(container) {
	    $( ""+container ).append('<button id="nextFileButton" class="btn btn-small" title="Go to the next file"><i class="icon-circle-arrow-right"></i></button>');
	    $( "#nextFileButton" ).click(function() {
			TSCORE.FileOpener.openFile(TSCORE.ViewManager.getNextFile(_openedFilePath));	    	
	    });
	}	
	
	function addPrevButton(container) {
	    $( ""+container ).append('<button id="prevFileButton" class="btn btn-small" title="Go to the previous file"><i class="icon-circle-arrow-left"></i></button>');
	    $( "#prevFileButton" ).click(function() {
			TSCORE.FileOpener.openFile(TSCORE.ViewManager.getPrevFile(_openedFilePath));
	    });
	}	
	
	function addCloseButton(container) {
	    $( ""+container ).append('<button id="closeOpenedFile" class="btn btn-small" title="Close file"><i class="icon-remove-sign"></i></button>');	    
	    $( "#closeOpenedFile" ).click(function() {
	        if(_isEditMode) {
	            if(confirm("If you confirm, all made changes will be lost.")){
	                // Cleaning the viewer/editor
	                document.getElementById("viewer").innerHTML = "";
					TSCORE.FileOpener.setFileOpened(false);
					TSCORE.closeFileViewer();
	                _isEditMode = false;                
	            }
	        } else {
	            // Cleaning the viewer/editor
	            document.getElementById("viewer").innerHTML = "";
	            TSCORE.FileOpener.setFileOpened(false);
				TSCORE.closeFileViewer();
	            _isEditMode = false;            
	        }
	    });    
	}	
	
	function addEditButton(container, filePath) {
	    var buttonDisabled = false;
	    // If no editor found, disabling the button
	    if(getFileEditor(filePath) === "false") {
	        buttonDisabled = true;
	    }
		var options;
		// Todo make use of buttonDisabled
        $( ""+container ).append('<button id="editDocument" class="btn btn-small" title="Edit file"><i class="icon-pencil"></i> Edit</button>');
	    $( "#editDocument" ).focus(function() {
	        this.blur();
	    })
	    .click(function() {
	        // TODO reenable edit
			TSCORE.showAlertDialog("Edit button currently disabled.");
			/*if ( $( this ).text() === "Edit" ) {
				options = {
					label: "Save&Close",
					icons: {
						primary: "ui-icon-disk"
					}
				};
	        	editFile(filePath);
			} else {
			    if(confirm("Do you really want to overwrite the current file?")) {
	                options = {
	                    label: "Edit",
	                    icons: {
	                        primary: "ui-icon-wrench"
	                    }
	                };
	                saveFile(filePath);
			    }
			}
			$( this ).button( "option", options );
			*/    	
	    });        
	}

	function addShowFullDetailsButton(container) {
        $( ""+container ).append('<button id="showFullDetails" class="btn btn-small" title="Show full file details"><i class="icon-list-alt"></i> Full details</button>');
	    $( "#showFullDetails" ).click(function() {
			TSCORE.toggleFileDetails();
	    });        
	}
	
	function addOpenInWindowButton(container, filePath) {
        $( ""+container ).append('<button id="openInNewWindow" class="btn btn-small" title="Open file in a new tab"><i class="icon-share"></i> Open in New Tab</button>');
	    $( "#openInNewWindow" ).click(function() {
	        window.open("file:///"+filePath);
	    });        
	}
	
	function addFullScreenButton(container) {
        $( ""+container ).append('<button id="startFullscreen" class="btn btn-small" title="Open file in full screen"><i class="icon-fullscreen"></i> Fullscreen</button>');
	    $( "#startFullscreen" ).click(function() {
	        var docElm = $("#viewer")[0];
	        if (docElm.requestFullscreen) {
	            docElm.requestFullscreen();
	        }
	        else if (docElm.mozRequestFullScreen) {
	            docElm.mozRequestFullScreen();
	        }
	        else if (docElm.webkitRequestFullScreen) {
	            docElm.webkitRequestFullScreen();
	        }
	    });    
	}
  
// Methods  
    exports.openFile                    		= openFile;
    exports.isFileOpened						= isFileOpened;
    exports.isFileEdited 						= isFileEdited;
    exports.setFileOpened						= setFileOpened;
    exports.getOpenedFilePath             		= getOpenedFilePath;  
    exports.updateEditorContent                 = updateEditorContent;
                                                          
});