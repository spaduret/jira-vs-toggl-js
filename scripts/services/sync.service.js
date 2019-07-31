define([
    'jquery',
    'underscore',
    'moment',
    "toggl.service",
    "jira.service",
    'sync.item',
    'settings'
], function ($,_, moment, togglService, jiraService, SyncItem, settings) {
    return {
        // Returns toggl history with logged time
        getWorkLogAsync: function () {
            const period = {
                start: moment().subtract(settings.reportingRange),
                end: moment()
            };
            const taskLog = [];
            const deferred = new $.Deferred();

            togglService
                .getSummaryAsync(period)
                .fail(deferred.reject)
                .done(function (summary) {
                    const tasks = _(summary).pluck('task');

                    return jiraService
                        .getIssuesAsync(tasks)
                        .then(function (issues) {
                            _(issues)
                                .each(function (issue) {
                                    const togglLog = _(summary).find(function (task) {
                                        return issue.key === task.task;
                                    });

                                    const issueWorklogTask = jiraService.getIssueWorklogAsync(issue.key);
                                    const togglLoggedTimeTask = togglService.getTotalLoggedTimeByTitleAsync(togglLog.title);

                                    $
                                        .when(issueWorklogTask, togglLoggedTimeTask)
                                        .fail(deferred.reject)
                                        .done(function (issueWorklog, totalTime) {

                                            const jiraTime = Math.round(issueWorklog / 60);
                                            const togglTime = Math.round(totalTime / 60);
                                            const item = new SyncItem(togglLog.task, issue.fields.summary, togglTime, jiraTime);

                                            taskLog.push(item);

                                            if (taskLog.length === issues.length) {
                                                deferred.resolve(taskLog);
                                            }
                                        });
                                });
                        });
                });

            return deferred.promise();
        },
        syncAsync: function (itemToSync) {
            if (!(itemToSync.unsynced > 0))
                throw new Error('Can log only positive time, Bad time value: ' + itemToSync.unsynced);

            if (!itemToSync.logDate.isValid())
                throw new Error('Log date is required');

            return jiraService.logWorkAsync(itemToSync);
        },
        timerSetup: function () {
            let view = this;
            view.updateUnsyncedTaskCount();

            // run every X minutes
            const timerId = setInterval(function () {
                view.updateUnsyncedTaskCount();
            }, 1 * 60 * 1000);

            return timerId;
        },
        updateUnsyncedTaskCount: function (tasksCount) {
            const view = this;

            if (isNaN(tasksCount)) {
                view
                    .getWorkLogAsync()
                    .fail(function(xhr, status, error){
                        chrome.browserAction.setBadgeText({text: '*' + xhr.status});
                        chrome.browserAction.setBadgeBackgroundColor({color: "black"});
                    })
                    .done(function (log) {
                        const count = _(log).filter(function (w) {
                            return w.unsynced > settings.timeToIgnoreMinutes;
                        }).length;

                        view.setBadgeText(count);
                    });
            } else {
                view.setBadgeText(tasksCount);
            }
        },
        setBadgeText: function(count){
            if (count > 0) {
                chrome.browserAction.setBadgeText({text: count.toString()});
                chrome.browserAction.setBadgeBackgroundColor({color: "red"});
            } else {
                chrome.browserAction.setBadgeText({text: '0'});
                chrome.browserAction.setBadgeBackgroundColor({color: "green"});
            }

            console.log('setBadgeText: ' + count);
        }
    };
});
