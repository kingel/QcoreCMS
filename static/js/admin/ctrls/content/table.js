// Generated by CoffeeScript 1.6.3
(function() {
  define([], function() {
    return [
      '$scope', '$resource', '$http', function($scope, $resource, $http) {
        var Tables, actions, getFormField, _form_field;
        actions = {
          save: {
            method: 'POST'
          },
          update: {
            method: 'PUT'
          },
          mulit: {
            method: 'GET',
            isArray: true
          }
        };
        Tables = $resource('/api/table', {}, actions);
        $scope.isList = true;
        $scope.tables = Tables.mulit();
        _form_field = [];
        getFormField = function(callback) {
          return $http.get('/api/get.form', {
            params: {
              form: 'app.forms.cms.Table'
            }
          }).success(function(data) {
            _form_field = data.form;
            $scope.form = angular.copy(_form_field);
            if (angular.isFunction(callback)) {
              return callback();
            }
          });
        };
        getFormField();
        $scope.submit = function() {
          var postData;
          postData = {};
          angular.forEach($scope.form, function(field) {
            return postData[field.name] = field.data;
          });
          $scope.isList = true;
          return Tables.save(postData, function(ret) {
            return $scope.tables = Tables.mulit();
          });
        };
        $scope.changeState = function(val) {
          var data;
          data = {
            id: val.id,
            state: 0
          };
          if (val.state === 0) {
            data.state = 1;
          }
          return Tables.update(data, function(ret) {
            return $scope.tables = Tables.mulit();
          });
        };
        $scope.add = function() {
          $scope.isList = false;
          return $scope.form = angular.copy(_form_field);
        };
        return $scope.edit = function(val) {
          $scope.isList = false;
          $scope.form = angular.copy(_form_field);
          return angular.forEach($scope.form, function(field) {
            if (field.name === 'table') {
              field.disabled = true;
            }
            if (val[field.name]) {
              return field.data = val[field.name];
            }
          });
        };
      }
    ];
  });

}).call(this);
