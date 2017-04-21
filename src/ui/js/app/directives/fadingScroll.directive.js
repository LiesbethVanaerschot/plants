(function () {
    'use strict';

    angular
        .module('lies_port')
        .directive('fadingScroll', fadingScroll);

    fadingScroll.$inject = ['$window'];

    /* @ngInject */
    function fadingScroll($window) {

        var directive = {
            link: link,
            restrict: 'A'
        };
        return directive;

        function link(scope, element, attrs) {
            var windowEl = angular.element($window),
                elPosition = element[0].getBoundingClientRect().top;

            var handler = function() {

                if ($window.pageYOffset >= 33) {
                    scope.fadeBoolean = true;
                }
                else {
                    scope.fadeBoolean = false;
                }

                scope.$apply();
            };

            windowEl.bind('scroll', function() {
                handler();
            });
        }
    }
})();