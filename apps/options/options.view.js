define([
    'require',
    'jquery',
    'underscore',
    'backbone',
    'settings'
], function(require, $, _, backbone, settings) {
    'use strict';
    return backbone.View.extend({
        el: 'body',
        events: {
            'click #save': 'onSave'
        },
        initialize: function() {

            this.$jiraServer = this.$('#jiraServer');
            this.$jiraEmail = this.$('#jiraEmail');
            this.$jiraUsername = this.$("#jiraUsername");
            this.$jiraApiToken = this.$('#jiraApiToken');

            this.$togglWorkspace = this.$('#togglWorkspace');
            this.$togglApiToken = this.$('#togglApiToken');
            this.$duration = this.$('#duration');

            this.render();
        },
        render: function() {
            const jiraSettings = settings.jira || {};
            this.$jiraServer.val(jiraSettings.server);
            this.$jiraEmail.val(jiraSettings.email);
            this.$jiraUsername.val(jiraSettings.username);
            this.$jiraApiToken.val(jiraSettings.apiToken);

            const togglSettings = settings.toggl || {};
            this.$togglWorkspace.val(togglSettings.workspace);
            this.$togglApiToken.val(togglSettings.apiToken);
            this.$duration.val(settings.reportingRange.asDays());

            const reportingDays = settings.reportingRange.asDays();
            _(this.$duration).each(function(toggle) {
                const $toggle = $(toggle);
                $toggle.attr('checked', parseInt($toggle.val()) === reportingDays);
            });
        },
        onSave: function() {
            const jiraSettings = {
                server: this.$jiraServer.val(),
                email: this.$jiraEmail.val(),
                username: this.$jiraUsername.val(),
                apiToken: this.$jiraApiToken.val()
            };

            const togglSettings = {
                workspace: this.$togglWorkspace.val(),
                apiToken: this.$togglApiToken.val()
            };

            settings.jira = jiraSettings;
            settings.toggl = togglSettings;
            settings.reportingRange = this.$duration.val();

            require(['sync.service'], function(syncService) {
                syncService.updateUnsyncedTaskCount();
            });

            this.showMessage('Settings saved.');
        },
        showMessage: function(message) {
        }
    });
});
