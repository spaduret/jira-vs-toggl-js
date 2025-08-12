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
            this.$jiraApiToken = this.$('#jiraApiToken');

            this.$togglApiToken = this.$('#togglApiToken');
            this.$duration = this.$('#duration');
            this.$syncApiCall = this.$('#syncApiCall');
            this.$useTimeEntryTitleAsComment = this.$('#useTimeEntryTitleAsComment');

            this.render();
        },
        render: function () {
            const jiraSettings = settings.jira || {};
            this.$jiraServer.val(jiraSettings.server);
            this.$jiraApiToken.val(jiraSettings.apiToken);

            const togglSettings = settings.toggl || {};
            this.$togglApiToken.val(togglSettings.apiToken);
            this.$duration.val(settings.reportingRange.asDays());
            this.$syncApiCall.attr('checked', settings.toggl.syncApiCall ? 'checked' : null);
            this.$useTimeEntryTitleAsComment.attr('checked', settings.toggl.useTimeEntryTitleAsComment ? 'checked' : null);
        },
        onSave: function () {
            const jiraSettings = {
                server: this.$jiraServer.val(),
                apiToken: this.$jiraApiToken.val(),
                syncApiCall: this.$syncApiCall.is(':checked')
            };

            const togglSettings = {
                apiToken: this.$togglApiToken.val(),
                useTimeEntryTitleAsComment: this.$useTimeEntryTitleAsComment.is(':checked')
            };

            settings.jira = jiraSettings;
            settings.toggl = togglSettings;
            settings.reportingRange = this.$duration.val();

            let view = this;
            require(['toggl.service', 'jira.service', 'sync.service'], function (togglService, jiraService, syncService) {
                try {
                    $
                        .when(
                            jiraService.saveUserSettingsAsync(),
                            togglService.saveUserSettingsAsync())
                        .fail((hxr, status, error) => {
                            chrome.action.setBadgeText({text: error || "error"});
                            chrome.action.setBadgeBackgroundColor({color: "black"});

                            view.$('#status').show();
                            view.$('#status').html('Error, see network console for details');
                        })
                        .done(() => {
                            view.$('#status').hide();
                            syncService.updateUnsyncedTaskCount();
                        });
                } catch (e) {
                    console.error(e);
                    view.$('#status').show();
                    view.$('#status').html(e.message ?? 'Error, see network console for details');
                }
            });
        }
    });
});