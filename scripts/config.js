define(function() {
    'use strict';

    require.config({
        waitSeconds: 0,
        baseUrl: '../../',
        enforceDefine: true,
        paths: {
            // libs
            'jquery': 'libs/jquery/jquery-3.3.1',
            'underscore': 'libs/underscore/underscore.min',
            'backbone': 'libs/backbone/backbone.min',
            'moment': 'libs/moment/moment.min',
            'text': 'libs/requirejs/text',
            'hbars': 'libs/requirejs/hbars',
            'Handlebars': 'libs/handlebars/handlebars-v4.1.2',

            'datatables.net': 'libs/datatables/jquery.dataTables.min',
            'datatables.net-bs': 'libs/datatables/dataTables.bootstrap.min',
            'datatables.net-fixedheader': 'libs/datatables/dataTables.fixedHeader.min',

            // local storage
            'settings': 'scripts/local.storage.settings',
            'settings.config': 'scripts/local.storage.settings.config',

            // services
            'toggl.service': 'scripts/services/toggl.service',
            'jira.service': 'scripts/services/jira.service',
            'sync.service': 'scripts/services/sync.service',

            // models
            'sync.item': 'scripts/models/sync.item',

            // apps
            'options': 'apps/options/options.view',
            'sync': 'apps/sync/sync.view',
            'sync.item.view': 'apps/sync/sync.item.view'
        },
        shim: {
            backbone: {
                deps: ['jquery', 'underscore']
            },
            hbars: {
                deps: ['text', 'Handlebars']
            },
            'datatables.net-fixedheader': {
                deps: ['datatables.net-bs']
            },
            'toggl.service': {
                deps: ['jquery']
            },
            'jira.service': {
                deps: ['jquery']
            },
            sync: {
                deps: ['datatables.net-fixedheader']
            }
        },
        deps: ['jquery', 'underscore'],
        callback: function($, _) {
            //use c# style templating: {variable}
            _.templateSettings = {interpolate: /{(.+?)}/g};
            _.isBetween = function(obj, low, high, inclusive = true) {
                if(_.isNumber(obj) && _.isNumber(low) && _.isNumber(high)) {
                    return inclusive
                        ? obj >= low && obj <= high
                        : obj > low && obj < high;
                }

                return false;
            };
        }
    });
});
