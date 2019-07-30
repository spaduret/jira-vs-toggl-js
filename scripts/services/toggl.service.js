define([
    'jquery',
    'underscore',
    'moment',
    'settings'
], function ($, _, moment, settings) {
    'use strict';

    const taskPattern = /[A-Z]+-\d+/;
    let _workspaceId = null,
        _userId = null;

    const authToken = btoa(settings.toggl.apiToken + ':api_token');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + authToken
    };
    const urls = {
        me: 'https://www.toggl.com/api/v8/me',
        summary: 'https://toggl.com/reports/api/v2/summary',
        details: 'https://toggl.com/reports/api/v2/details'
    };

    const settingsXhr = $.ajax({
        url: urls.me,
        headers: headers,
        type: 'GET',
        async: true
    }).then(function (response) {
        const workspace = _(response.data.workspaces)
            .find(function (ws) {
                return ws.name === settings.toggl.workspace;
            });

        if (workspace) {
            _workspaceId = workspace.id;
            _userId = response.data.id;
        }
    });

    return {
        settings: settings.toggl,
        getSummaryAsync: function (period) {
            return settingsXhr
                .then(() => {
                    const params = {
                        user_agent: 'jira',
                        workspace_id: _workspaceId,
                        user_ids: _userId,
                        since: period.start.format('YYYY-MM-DD'),
                        until: period.end.format('YYYY-MM-DD')
                    };

                    return $.ajax({
                        url: urls.summary + '?' + $.param(params),
                        headers: headers,
                        type: 'GET',
                        async: true
                    })
                        .then(function (response) {
                            return _.chain(response.data)
                                .pluck('items')
                                .flatten(true)
                                .filter(function (item) {
                                    return taskPattern.test(item.title.time_entry);
                                })
                                .map(function (item) {
                                    return {
                                        time: item.time,
                                        title: item.title.time_entry,
                                        task: taskPattern.exec(item.title.time_entry)[0]
                                    };
                                })
                                .groupBy('task')
                                .map(function (group, task) {
                                    return {
                                        task: task,
                                        title: group[0].title,
                                        time: Math.round(_(group).reduce(function (memo, item) {
                                            return memo + item.time;
                                        }, 0) / 1000)
                                    };
                                })
                                .value();
                        });
                });
        },
        // get all time entries for the last 365 days
        getTotalLoggedTimeByTitleAsync: function (title) {
            return settingsXhr
                .then(() => {
                    const params = {
                        user_agent: 'jira',
                        workspace_id: _workspaceId,
                        user_ids: _userId,
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
                        .then(function (response) {
                            return Math.round(response[0].total_grand / 1000);
                        });
                });
        }
    };
});
