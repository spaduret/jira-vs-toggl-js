define([
    'require',
    'jquery',
    'underscore',
    'backbone',
    'settings'
], function (require, $, _, backbone, settings) {
    'use strict';
    return backbone.View.extend({
        el: 'body',
        events: {
            'click #save': 'onSave'
        },
        initialize: function () {

            this.$jiraServer = this.$('#jiraServer');
            this.$jiraEmail = this.$('#jiraEmail');
            this.$jiraApiToken = this.$('#jiraApiToken');

            this.$togglWorkspace = this.$('#togglWorkspace');
            this.$togglApiToken = this.$('#togglApiToken');

            this.$duration = this.$('[name=duration]');

            this.render();
        },
        render: function () {
            const jiraSettings = settings.jira || {};
            this.$jiraServer.val(jiraSettings.server);
            this.$jiraEmail.val(jiraSettings.email);
            this.$jiraApiToken.val(jiraSettings.apiToken);

            const togglSettings = settings.toggl || {};
            this.$togglWorkspace.val(togglSettings.workspace);
            this.$togglApiToken.val(togglSettings.apiToken);

            _(this.$duration).each(function (toggle) {
                const $toggle = $(toggle);
                $toggle.attr('checked', parseInt($toggle.val()) === settings.reportingRange.asDays());
            });
        },
        onSave: function () {
            const jiraSettings = {
                server: this.$jiraServer.val(),
                email: this.$jiraEmail.val(),
                apiToken: this.$jiraApiToken.val()
            };

            const togglSettings = {
                workspace: this.$togglWorkspace.val(),
                apiToken: this.$togglApiToken.val()
            };

            const selectedReportingRange = this.$('[name=duration]:checked').val();

            settings.jira = jiraSettings;
            settings.toggl = togglSettings;
            settings.reportingRange = selectedReportingRange;

            // todo: if all settings are good
            if (true) {
                require(['sync.service'], function (syncService) {
                    syncService.updateUnsyncedTaskCount();
                });
            } else {
                chrome.browserAction.setBadgeText({text: ''});
                chrome.browserAction.setBadgeBackgroundColor({color: "gray"});
            }

            this.showMessage('Settings saved.');
        },
        showMessage: function (message) {
        }
    });
});
