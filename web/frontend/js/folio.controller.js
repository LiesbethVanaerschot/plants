(function () {
    'use strict';

    angular
        .module('lies_port')
        .controller('FolioController', FolioController);

    FolioController.$inject = ['$scope'];

    /* @ngInject */
    function FolioController($scope) {
        var vm = this;
        vm.folios = [
            {
                id: 1,
                cover: path,
                title: string,
                description: string,
                links: [{
                        one: path,
                        two: path
                    }],
                images: [{
                        one: path,
                        two: path
                }]
            }
        ]

    }

})();