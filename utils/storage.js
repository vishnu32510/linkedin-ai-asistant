// Storage utility functions - Single Responsibility: Chrome storage operations only
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }

  LinkedInExtension.Storage = {
    getStorage: function(key) {
      return new Promise(function(resolve) {
        chrome.storage.sync.get([key], function(result) {
          resolve(result[key]);
        });
      });
    },

    setStorage: function(key, value) {
      return new Promise(function(resolve) {
        chrome.storage.sync.set({}, function() {
          var obj = {};
          obj[key] = value;
          chrome.storage.sync.set(obj, function() {
            resolve();
          });
        });
      });
    },

    getStorageMultiple: function(keys) {
      return new Promise(function(resolve) {
        chrome.storage.sync.get(keys, function(result) {
          resolve(result);
        });
      });
    }
  };
})();
