/* Copyright (c) 2012-2015 The TagSpaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that
 * can be found in the LICENSE file. */
define(function(require, exports, module) {
  'use strict';
  console.log('Loading perspective.manager.js ...');
  var perspectives;
  var TSCORE = require('tscore');
  var TSPRO = require("tspro");

  function initPerspective(extPath) {
    return new Promise(function(resolve, reject) {
      require([extPath], function(perspective) {
        perspectives.push(perspective);
       
        // Creating perspective's toolbar
        $('#viewToolbars').append($('<div>', {
          id: perspective.ID + 'Toolbar',
          class: 'btn-toolbar'
        }).hide());
        // Creating perspective's container
        $('#viewContainers').append($('<div>', {
          id: perspective.ID + 'Container',
          style: 'width: 100%; height: 100%'
        }).hide());
        // Creating perspective's footer
        $('#viewFooters').append($('<div>', {
          id: perspective.ID + 'Footer'
        }).hide());
        //TODO: return init as promise
        perspective.init();
        resolve(true);
      }); // jshint ignore:line
    }); 
  }

  function initPerspectives() {
    perspectives = [];
    $('#viewSwitcher').empty();
    $('#viewToolbars').empty();
    $('#viewContainers').empty();
    $('#viewFooters').empty();
    initWelcomeScreen();

    var extensions = TSCORE.Config.getPerspectives();
    var promises = [];
    for (var i = 0; i < extensions.length; i++) {
      var extPath = TSCORE.Config.getExtensionPath() + '/' + extensions[i].id + '/extension.js';
      promises.push(initPerspective(extPath));
    }
    
    return Promise.all(promises).then(function() {
      initPerspectiveSwitcher();
      // Opening last saved location by the start of the application (not in firefox)
      var lastLocation = TSCORE.Config.getLastOpenedLocation(); 
      if (TSCORE.Config.getUseDefaultLocation()) {
        lastLocation = TSCORE.Config.getDefaultLocation();
      }
      if (lastLocation !== undefined && lastLocation.length >= 1 && !isFirefox) {
        TSCORE.openLocation(lastLocation);
        TSCORE.IO.checkAccessFileURLAllowed();
        var evt = TSCORE.createDocumentEvent("initApp");
        TSCORE.fireDocumentEvent(evt);
        $("#viewContainers").removeClass("appBackgroundTile");
      }
      $('#loading').hide();
      if (isNode) {
        TSCORE.IO.showMainWindow();
      }
      return true;
    });
  }

  var initWelcomeScreen = function() {
    /* require([
              "text!templates/WelcomeScreen.html",
            ], function(uiTPL) {
                // Check if dialog already created
                if($("#dialogLocationEdit").length < 1) {
                    var uiTemplate = Handlebars.compile( uiTPL );
                    $("#viewContainers").append(uiTemplate()); 
                }
        }); */
    $('#viewContainers').append('<div id="welcomeScreen"></div>');
  };

  var initPerspectiveSwitcher = function() {
    var extensions = TSCORE.Config.getPerspectives();
    var $perspectiveSwitcher = $('#perspectiveSwitcher');
    $perspectiveSwitcher.empty();
    $perspectiveSwitcher.append($('<li>', {
      class: 'dropdown-header',
      text: $.i18n.t('ns.common:perspectiveSwitch')
    }).prepend("<button class='close'>&times;</button>"));
    for (var i = 0; i < extensions.length; i++) {
      var curPers;
      // Finding the right perspective 
      perspectives.forEach(function(value) {
        if (value.ID === extensions[i].id) {
          curPers = value;
        }
      }); // jshint ignore:line
      $perspectiveSwitcher.append($('<li>', {}).append($('<a>', {
        'viewid': curPers.ID,
        'title': curPers.ID,
        'id': curPers.ID + 'Button',
        'text': curPers.Title
      }).prepend($('<i>', {
        'class': curPers.Icon + ' fa-lg',
        'style': 'margin-right: 15px'
      }))));
      // Adding event listener & icon to the radio button
      $('#' + curPers.ID + 'Button').click(function() {
        changePerspective($(this).attr('viewid'));
      }); // jshint ignore:line
    }
  };

  var redrawCurrentPerspective = function() {
    for (var i = 0; i < perspectives.length; i++) {
      if (perspectives[i].ID === TSCORE.currentPerspectiveID) {
        try {
          perspectives[i].load();
          break;
        } catch (e) {
          console.warn("Error while executing 'redrawCurrentPerspective' on " + perspectives[i].ID + ' ' + e);
        }
      }
    }
  };

  var removeFileUI = function(filePath) {
    console.log('Removing file from perspectives');
    for (var i = 0; i < perspectives.length; i++) {
      try {
        perspectives[i].removeFileUI(filePath);
      } catch (e) {
        console.warn("Error while executing 'removeFileUI' on " + perspectives[i].ID + ' ' + e);
      }
    }
  };

  var updateFileUI = function(oldFilePath, newFilePath) {
    console.log('Updating file in perspectives');
    for (var i = 0; i < perspectives.length; i++) {
      try {
        perspectives[i].updateFileUI(oldFilePath, newFilePath);
      } catch (e) {
        console.warn("Error while executing 'updateFileUI' on " + perspectives[i].ID + ' ' + e);
      }
    }
  };

  var getNextFile = function(filePath) {
    for (var i = 0; i < perspectives.length; i++) {
      if (perspectives[i].ID === TSCORE.currentPerspectiveID) {
        try {
          return perspectives[i].getNextFile(filePath);
        } catch (e) {
          console.warn("Error while executing 'getNextFile' on " + perspectives[i].ID + ' ' + e);
        }
      }
    }
  };

  var getPrevFile = function(filePath) {
    for (var i = 0; i < perspectives.length; i++) {
      if (perspectives[i].ID === TSCORE.currentPerspectiveID) {
        try {
          return perspectives[i].getPrevFile(filePath);
        } catch (e) {
          console.warn("Error while executing 'getPrevFile' on " + perspectives[i].ID + ' ' + e);
        }
      }
    }
  };

  var updateTreeData = function(treeData) {
    for (var i = 0; i < perspectives.length; i++) {
      try {
        perspectives[i].updateTreeData(treeData);
      } catch (e) {
        console.warn("Error while executing 'updateTreeData' on "); // + perspectives[i].ID + ' ' + e);
      }
    }
  };

  var updateFileBrowserData = function(dirList) {
    console.log('Updating the file browser data...');
    TSCORE.fileList = [];
    var workers = [];
    var tags, ext, title, fileSize, fileLMDT, path, filename, entry;
    for (var i = 0; i < dirList.length; i++) {
      // Considering Unix HiddenEntries (. in the beginning of the filename)
      if (TSCORE.Config.getShowUnixHiddenEntries() || !TSCORE.Config.getShowUnixHiddenEntries() && dirList[i].path.indexOf(TSCORE.dirSeparator + '.') < 0) {
        filename = dirList[i].name.replace(/(<([^>]+)>)/gi, ''); // sanitizing filename
        path = dirList[i].path.replace(/(<([^>]+)>)/gi, ''); // sanitizing filepath
        title = TSCORE.TagUtils.extractTitle(path);

        if (dirList[i].isFile) {
          ext = TSCORE.TagUtils.extractFileExtension(path);
          tags = TSCORE.TagUtils.extractTags(path);
          fileSize = dirList[i].size;
          fileLMDT = dirList[i].lmdt;
          if (fileSize === undefined) {
            fileSize = '';
          }
          if (fileLMDT === undefined) {
            fileLMDT = '';
          }
          var metaObj = {
            thumbnailPath: "",
            metaData: null
          };
          entry = [
            ext,
            title,
            tags,
            fileSize,
            fileLMDT,
            path,
            filename,
            metaObj
          ];
          TSCORE.fileList.push(entry);
          workers.push(TSCORE.Meta.loadMetaDataFromFile(entry));
        } else {
          entry = [
            path,
            filename
          ];
          TSCORE.subDirsList.push(entry);
        }
      }
    }
    
    Promise.all(workers).then(function(result) {
      changePerspective(TSCORE.currentPerspectiveID);
    }).catch(function(e) {
      console.error("MetaData Error: " + e);
    });
  };
  
  var refreshFileListContainer = function() {
    // TODO consider search view
    TSCORE.IO.listDirectory(TSCORE.currentPath);
  };

  var hideAllPerspectives = function() {
    $('#welcomeScreen').hide();
    for (var i = 0; i < perspectives.length; i++) {
      $('#' + perspectives[i].ID + 'Container').hide();
      $('#' + perspectives[i].ID + 'Toolbar').hide();
      $('#' + perspectives[i].ID + 'Footer').hide();
    }
  };

  var changePerspective = function(viewType) {
    console.log('Change to ' + viewType + ' perspective.');
    TSCORE.showLoadingAnimation();
    // Loading first perspective by default
    if (viewType === undefined) {
      TSCORE.currentPerspectiveID = perspectives[0].ID;
    } else {
      //Setting the current view
      TSCORE.currentPerspectiveID = viewType;
    }
    if (TSCORE.currentPerspectiveID === undefined) {
      TSCORE.showAlertDialog('No Perspectives found', '');
      return false;
    }
    hideAllPerspectives();
    for (var i = 0; i < perspectives.length; i++) {
      if (perspectives[i].ID === viewType) {
        var $currentPerspectitveIcon = $('#currentPerspectitveIcon');
        var $currentPerspectitveName = $('#currentPerspectitveName');
        $currentPerspectitveIcon.removeClass();
        $currentPerspectitveIcon.addClass(perspectives[i].Icon);
        $currentPerspectitveIcon.addClass('fa-lg');
        $currentPerspectitveName.text(' ' + perspectives[i].Title);
        $currentPerspectitveName.attr('title', perspectives[i].ID);
        perspectives[i].load();
        $('#' + perspectives[i].ID + 'Container').show();
        $('#' + perspectives[i].ID + 'Toolbar').show();
        $('#' + perspectives[i].ID + 'Footer').show();
      }
    }
    // Clear the list with the selected files    
    clearSelectedFiles();
    // Enabled the main toolbar e.g. search functionality
    TSCORE.enableTopToolbar();
  };

  var clearSelectedFiles = function() {
    // Clear selected files
    TSCORE.selectedFiles = [];
    for (var i = 0; i < perspectives.length; i++) {
      try {
        perspectives[i].clearSelectedFiles();
      } catch (e) {
        console.error('Error while executing \'clearSelectedFiles\' on ' + perspectives[i].ID + ' - ' + e);
      }
    }
  };

  exports.initPerspectives = initPerspectives;
  exports.hideAllPerspectives = hideAllPerspectives;
  exports.redrawCurrentPerspective = redrawCurrentPerspective;
  exports.getNextFile = getNextFile;
  exports.getPrevFile = getPrevFile;
  exports.updateTreeData = updateTreeData;
  exports.updateFileBrowserData = updateFileBrowserData;
  exports.refreshFileListContainer = refreshFileListContainer;
  exports.clearSelectedFiles = clearSelectedFiles;
  exports.removeFileUI = removeFileUI;
  exports.updateFileUI = updateFileUI;
  exports.changePerspective = changePerspective; //exports.generateDesktop              = generateDesktop;
});
