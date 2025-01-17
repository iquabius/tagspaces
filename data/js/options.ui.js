/* Copyright (c) 2012-2015 The TagSpaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that
 * can be found in the LICENSE file. */
/* global define, Mousetrap, Handlebars  */
define(function(require, exports, module) {
  'use strict';
  console.log('Loading options.ui.js ...');
  var TSCORE = require('tscore');
  require(['libs/filesaver.js/FileSaver.js'], function() {});

  function generateSelectOptions(parent, data, selectedId, helpI18NString) {
    parent.empty();
    if (!helpI18NString) {
      helpI18NString = "";
    }
    parent.append($('<option>')
      .text('')
      .attr("data-i18n", helpI18NString)
      .val('false'));
    data.forEach(function(value) {
      if (selectedId === value) {
        parent.append($('<option>').attr('selected', 'selected').text(value).val(value));
      } else {
        parent.append($('<option>').text(value).val(value));
      }
    });
  }

  function addPerspective(parent, perspectiveId) {
    var perspectiveControl = $('<div class="form-inline">')
        .append($('<div class="flexLayout">')
          .append($('<select class="form-control flexMaxWidth"></select>'))
          .append($('<button class="btn btn-link" style="width: 40px" data-i18n="[title]ns.dialogs:removePerspectiveTooltip"><i class="fa fa-times"></button>')
            .click(function() {
              $(this).parent().parent().remove();
            })));
    generateSelectOptions(perspectiveControl.find('select'), TSCORE.Config.getPerspectiveExtensions(), perspectiveId, "ns.dialogs:choosePerspective");
    perspectiveControl.i18n();
    parent.append(perspectiveControl);
  }

  function addFileType(parent, fileext, viewerId, editorId) {
    var fileTypeControl = $('<div class="form-inline">')
        .append($('<div class="flexLayout" >')
          .append($('<input style="width: 80px" type="text" class="form-control" data-i18n="[placeholder]ns.dialogs:fileExtensionPlaceholder">').val(fileext))
          .append($('<select class="ftviewer form-control flexMaxWidth"></select>'))
          .append($('<select class="fteditor form-control flexMaxWidth"></select>'))
          .append($('<button style="width: 30px" class="btn btn-link" data-i18n="[title]ns.dialogs:removeFileTypeTooltip"><i class="fa fa-times"></button>')
            .click(function() {
              $(this).parent().parent().remove();
            })));
    generateSelectOptions(fileTypeControl.find('.ftviewer'), TSCORE.Config.getViewerExtensions(), viewerId, "ns.dialogs:chooseFileViewer");
    generateSelectOptions(fileTypeControl.find('.fteditor'), TSCORE.Config.getEditorExtensions(), editorId, "ns.dialogs:chooseFileEditor");
    fileTypeControl.i18n();
    parent.prepend(fileTypeControl);
  }

  function initUI() {
    $('#addFileTypeButton').click(function(e) {
      // Fixes reloading of the application by click
      e.preventDefault();
      addFileType($('#fileTypesList'), '', '', '');
      //$('#fileTypesList').parent().animate({ scrollTop: ($('#fileTypesList').height()) }, 'slow');
    });
    $('#addPerspectiveButton').click(function(e) {
      // Fixes reloading of the application by click
      e.preventDefault();
      addPerspective($('#perspectiveList'), '');
    });
    $('#saveSettingsCloseButton').click(function() {
      updateSettings();
      $('#dialogOptions').modal('hide');
      //TSCORE.reloadUI();
    });
    $('#defaultSettingsButton').click(function() {
      TSCORE.showConfirmDialog(
          $.i18n.t('ns.dialogs:restoreDefaulSettingTitleConfirm'),
          $.i18n.t('ns.dialogs:restoreDefaulSettingMessageConfirm'), function() {
        TSCORE.Config.loadDefaultSettings();
      });
    });
    $('#keyBindingInstructions').toggle();
    $('#keyBindingInstructionsToggle').on('click', function() {
      $('#keyBindingInstructions').toggle();
      return false;
    });
    if (isCordova) {
      $('#exportTagGroupsButton').hide();
      $('#showMainMenuCheckbox').parent().hide();
    }
    $('#exportTagGroupsButton').click(function() {
      var jsonFormat = '{ "appName": "' + TSCORE.Config.DefaultSettings.appName +
        '", "appVersion": "' + TSCORE.Config.DefaultSettings.appVersion +
        '", "appBuild": "' + TSCORE.Config.DefaultSettings.appBuild +
        '", "settingsVersion": ' + TSCORE.Config.DefaultSettings.settingsVersion +
        ', "tagGroups": ';
      var blob = new Blob([jsonFormat + JSON.stringify(TSCORE.Config.getAllTagGroupData()) + '}'], {
        type: 'application/json'
      });
      saveAs(blob, 'tsm[' + TSCORE.TagUtils.formatDateTime4Tag(new Date(), true) + '].json');
      console.log('Group Data Saved...');
    });
  }

  function reInitUI() {
    $('#extensionsPathInput').val(TSCORE.Config.getExtensionPath());
    $('#showHiddenFilesCheckbox').attr('checked', TSCORE.Config.getShowUnixHiddenEntries());
    $('#showMainMenuCheckbox').attr('checked', TSCORE.Config.getShowMainMenu());
    $('#checkforUpdatesCheckbox').attr('checked', TSCORE.Config.getCheckForUpdates());
    $('#calculateTagsCheckbox').attr('checked', TSCORE.Config.getCalculateTags());
    $('#loadLocationMetaData').attr('checked', TSCORE.Config.getLoadLocationMeta());
    $('#tagsDelimiterInput').val(TSCORE.Config.getTagDelimiter());
    $('#prefixTagContainerInput').val(TSCORE.Config.getPrefixTagContainer());
    $('#nextDocumentKeyBinding').val(TSCORE.Config.getNextDocumentKeyBinding());
    $('#prevDocumentKeyBinding').val(TSCORE.Config.getPrevDocumentKeyBinding());
    $('#closeDocumentKeyBinding').val(TSCORE.Config.getCloseViewerKeyBinding());
    $('#addRemoveTagsKeyBinding').val(TSCORE.Config.getAddRemoveTagsKeyBinding());
    $('#editDocumentKeyBinding').val(TSCORE.Config.getEditDocumentKeyBinding());
    $('#reloadDocumentKeyBinding').val(TSCORE.Config.getReloadDocumentKeyBinding());
    $('#saveDocumentKeyBinding').val(TSCORE.Config.getSaveDocumentKeyBinding());
    $('#documentPropertiesKeyBinding').val(TSCORE.Config.getPropertiesDocumentKeyBinding());
    $('#showSearchKeyBinding').val(TSCORE.Config.getSearchKeyBinding());
    $('#perspectiveList').empty();
    $('#writeMetaToSidecarFile').attr('checked', TSCORE.Config.getWriteMetaToSidecarFile());
    $('#useDefaultLocationCheckbox').attr('checked', TSCORE.Config.getUseDefaultLocation());
    TSCORE.Config.getPerspectives().forEach(function(value) {
      addPerspective($('#perspectiveList'), value.id);
    });
    var $languagesDropdown = $('#languagesList');
    $languagesDropdown.empty();
    TSCORE.Config.getSupportedLanguages().forEach(function(value) {
      if (TSCORE.Config.getInterfaceLangauge() === value.iso) {
        $languagesDropdown.append($('<option>').attr('selected', 'selected').text(value.title).val(value.iso));
      } else {
        $languagesDropdown.append($('<option>').text(value.title).val(value.iso));
      }
    });
    $('#fileTypesList').empty();

    TSCORE.Config.getSupportedFileTypes().sort(function(a, b) {
      if (a.type > b.type) {
        return -1;
      }
      if (a.type < b.type) {
        return 1;
      }
      return 0;
    }).forEach(function(value) {
      addFileType($('#fileTypesList'), value.type, value.viewer, value.editor);
    });

    $('#dialogOptions a:first').tab('show');
    $('#dialogOptions').modal({
      backdrop: 'static',
      show: true
    });
  }

  function parseKeyBinding(keybinding) {
    keybinding = keybinding.trim();
    if (keybinding.indexOf(',') >= 0) {
      keybinding = keybinding.split(',');
    }
    return keybinding;
  }

  function updateSettings() {
    TSCORE.Config.setExtensionPath($('#extensionsPathInput').val());
    TSCORE.Config.setShowUnixHiddenEntries($('#showHiddenFilesCheckbox').is(':checked'));
    TSCORE.Config.setShowMainMenu($('#showMainMenuCheckbox').is(':checked'));
    TSCORE.Config.setCheckForUpdates($('#checkforUpdatesCheckbox').is(':checked'));
    TSCORE.Config.setCalculateTags($('#calculateTagsCheckbox').is(':checked'));
    TSCORE.Config.setTagDelimiter($('#tagsDelimiterInput').val());
    TSCORE.Config.setPrefixTagContainer($('#prefixTagContainerInput').val());
    TSCORE.Config.setLoadLocationMeta($('#loadLocationMetaData').is(':checked'));
    TSCORE.Config.setNextDocumentKeyBinding(parseKeyBinding($('#nextDocumentKeyBinding').val()));
    TSCORE.Config.setPrevDocumentKeyBinding(parseKeyBinding($('#prevDocumentKeyBinding').val()));
    TSCORE.Config.setCloseViewerKeyBinding(parseKeyBinding($('#closeDocumentKeyBinding').val()));
    TSCORE.Config.setAddRemoveTagsKeyBinding(parseKeyBinding($('#addRemoveTagsKeyBinding').val()));
    TSCORE.Config.setEditDocumentKeyBinding(parseKeyBinding($('#editDocumentKeyBinding').val()));
    TSCORE.Config.setReloadDocumentKeyBinding(parseKeyBinding($('#reloadDocumentKeyBinding').val()));
    TSCORE.Config.setSaveDocumentKeyBinding(parseKeyBinding($('#saveDocumentKeyBinding').val()));
    TSCORE.Config.setPropertiesDocumentKeyBinding(parseKeyBinding($('#documentPropertiesKeyBinding').val()));
    TSCORE.Config.setSearchKeyBinding(parseKeyBinding($('#showSearchKeyBinding').val()));
    var interfaceLang = $('#languagesList').val();
    TSCORE.Config.setInterfaceLangauge(interfaceLang);
    TSCORE.switchInterfaceLanguage(interfaceLang);
    TSCORE.Config.setPerspectives(collectPerspectivesData());
    TSCORE.Config.setSupportedFileTypes(collectSupportedFileTypesData());
    TSCORE.Config.setWriteMetaToSidecarFile($('#writeMetaToSidecarFile').is(':checked'));
    TSCORE.Config.setUseDefaultLocation($('#useDefaultLocationCheckbox').is(':checked'));
    TSCORE.Config.saveSettings();
  }

  function collectPerspectivesData() {
    var data = [];
    $('#perspectiveList').children().each(function(index, element) {
      if ($(element).find('select').val() != 'false') {
        data.push({
          'id': $(element).find('select').val()
        });
      }
    });
    return data;
  }

  function collectSupportedFileTypesData() {
    var data = [];
    $('#fileTypesList').children().each(function(index, element) {
      data.push({
        'type': $(element).find('input').val(),
        'viewer': $(element).find('.ftviewer').val(),
        'editor': $(element).find('.fteditor').val()
      });
    });
    return data;
  }

  // Public Methods
  exports.initUI = initUI;
  exports.reInitUI = reInitUI;
});
