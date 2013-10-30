define ['admin/directive'], (app)->
    app.controller('categoryCtrl' , ['$scope', '$resource', '$http', 'Msg',
    ($scope, $resource, $http, Msg)->
        Msg.alert 'hello word'
        actions =
            save: method: 'POST'
            mulit: method: 'GET', isArray: true

        Catgory = $resource('/api/category', {}, actions)

        $scope.isList   = true
        $scope.catgorys = Catgory.mulit()
        $scope._AppFormsCmsCategoryName = 'categoryFrom'

          
        $scope.onSubmitAppFormsCmsCategory = ->
            formEl   = this.formEl
            postData = {}

            formEl.find('[name]').each ->
                self = $ this
                postData[self.attr('name')] = self.val()

            Catgory.save(postData, ->
                $scope.isList   = true
                $scope.catgorys = Catgory.mulit()
            )

        # 编辑表单
        $scope.edit = (val) ->
            formEl   = this.formEl
            $scope.isList = false

            formEl.find('[name]').each ->
                self = $ this
                if val[self.attr('name')]
                    self.val val[self.attr('name')]

        $scope.add = ->
            this.formEl[0].reset()
            
            this.formEl.find('[type=hidden]').each ->
                $(this).val('')
            $scope.isList = false

        $scope.onLoadAppFormsCmsCategory = (el)->
            formEl = el.find('form')
            $scope.formEl = formEl

       
    ])
    return
