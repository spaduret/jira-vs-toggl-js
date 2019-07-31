define([
    'jquery',
    'underscore',
    'moment',
    'settings'
], function($, _, moment, settings) {
    'use strict';

    const taskPattern = /[A-Z]+-\d+/;

    const urls = {
        me: 'https://www.toggl.com/api/v8/me',
        summary: 'https://toggl.com/reports/api/v2/summary',
        details: 'https://toggl.com/reports/api/v2/details'
    };

    let headers = {};
    const deferred = new $.Deferred();
    const getSettingsAsync = function() {
        if(deferred.state() != "resolved") {
            headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa(settings.toggl.apiToken + ':api_token')
            };

            $
                .ajax({
                    url: urls.me,
                    headers: headers,
                    type: 'GET',
                    async: true
                })
                .fail(deferred.reject)
                .then(function(response) {
                    const workspace = _(response.data.workspaces)
                        .find(function(ws) {
                            return ws.name === settings.toggl.workspace;
                        });

                    deferred.resolve({
                        workspaceId: workspace.id,
                        userId: response.data.id
                    });
                });
        }

        return deferred.promise();
    };

    return {
        settings: settings.toggl,
        getSummaryAsync: function(period) {
            return getSettingsAsync()
                .then((settings) => {
                    const params = {
                        user_agent: 'jira',
                        workspace_id: settings.workspaceId,
                        user_ids: settings.userId,
                        since: period.start.format('YYYY-MM-DD'),
                        until: period.end.format('YYYY-MM-DD')
                    };

                    return $.ajax({
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
                                        }, 0) / 1000)
                                    };
                                })
                                .value();
                        });
                });
        },
        // get all time entries for the last 365 days
        getTotalLoggedTimeByTitleAsync: function(title) {
            return getSettingsAsync()
                .then((settings) => {
                    const params = {
                        user_agent: 'jira',
                        workspace_id: settings.workspaceId,
                        user_ids: settings.userId,
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
                });
        }
    };
});
