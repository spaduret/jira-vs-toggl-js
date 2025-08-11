define([
    'jquery',
    'underscore',
    'moment',
    'settings'
], function($, _, moment, settings) {
    'use strict';

    const taskPattern = /[A-Z]+-\d+/;

    // https://github.com/toggl/toggl_api_docs
    const urls = {
        me: 'https://api.track.toggl.com/api/v9/me',
        summary: 'https://api.track.toggl.com/reports/api/v2/summary',
        details: 'https://api.track.toggl.com/reports/api/v2/details'
    };

    let headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(settings.toggl.apiToken + ':api_token')
    };

    return {
        saveUserSettingsAsync: function() {
            return $
                .ajax({
                    url: urls.me,
                    headers: headers,
                    type: 'GET',
                    async: true
                })
                .then(function(response) {
                    let togglSettings = settings.toggl;
                    togglSettings.workspaceId = response.default_workspace_id;
                    togglSettings.userId = response.id;
                    settings.toggl = togglSettings

                    return togglSettings;
                });
        },
        getSummaryAsync: function(period, includeComments = false) {
            const params = {
                user_agent: 'jira',
                workspace_id: settings.toggl.workspaceId,
                user_ids: settings.toggl.userId,
                grouping: 'users',
                subgrouping: 'time_entries',
                // subgrouping_ids: true,
                // grouped_time_entry_ids: true,
                since: period.start.format('YYYY-MM-DD'),
                until: period.end.format('YYYY-MM-DD')
            };

            return $
                .ajax({
                    url: urls.summary + '?' + $.param(params),
                    headers: headers,
                    type: 'GET',
                    async: true
                })
                .then(function(response) {
                    return _.chain(response.data)
                        .pluck('items')
                        .flatten(true)
                        .filter(function(item) {
                            return taskPattern.test(item.title.time_entry);
                        })
                        .map(function(item) {
                            return {
                                time: item.time,
                                title: item.title.time_entry,
                                task: taskPattern.exec(item.title.time_entry)[0]
                            };
                        })
                        .groupBy('task')
                        .map(function(group, task) {
                            return {
                                task: task,
                                title: group[0].title,
                                time: Math.round(_(group).reduce(function(memo, item) {
                                    return memo + item.time;
                                }, 0) / 1000),
                                comments: includeComments
                                    ? group.map(i => i.title).join('\n')
                                    : null
                            };
                        })
                        .value();
                });
        },
        // get all time entries for the last 365 days
        getTotalLoggedTimeByTitleAsync: function(title) {
            const params = {
                user_agent: 'jira',
                workspace_id: settings.toggl.workspaceId,
                user_ids: settings.toggl.userId,
                description: title,
                since: moment().add(-365, 'd').format('YYYY-MM-DD'),
                until: moment().format('YYYY-MM-DD')
            };

            return $
                .ajax({
                    url: urls.details + '?' + $.param(params),
                    headers: headers,
                    type: 'GET',
                    async: true
                })
                .then(function(response) {
                    return Math.round(response.total_grand / 1000);
                });
        }
    };
});