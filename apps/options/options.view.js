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
            this.$syncApiCall = this.$('#syncApiCall');
            this.$useTimeEntryTitleAsComment = this.$('#useTimeEntryTitleAsComment');

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
            this.$syncApiCall.attr('checked', settings.toggl.syncApiCall ? 'checked' : null);
            this.$useTimeEntryTitleAsComment.attr('checked', settings.toggl.useTimeEntryTitleAsComment ? 'checked' : null);
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
                apiToken: this.$togglApiToken.val(),
                syncApiCall: this.$syncApiCall.is(':checked'),
                useTimeEntryTitleAsComment: this.$useTimeEntryTitleAsComment.is(':checked')
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
