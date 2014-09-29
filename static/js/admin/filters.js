// Generated by CoffeeScript 1.6.3
(function() {
  define(['angular', 'admin/services'], function(angular, services) {
    'use strict';
    angular.module('admin.filters', ['admin.services']).filter('interpolate', [
      'version', function(version) {
        return function(text) {
          return String(text).replace(/\%VERSION\%/mg, version);
        };
      }
    ]);
  });

}).call(this);
