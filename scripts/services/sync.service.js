define([
    'jquery',
    'underscore',
    'moment',
    "toggl.service",
    "jira.service",
    'sync.item',
    'settings'
], function($, _, moment, togglService, jiraService, SyncItem, settings) {
    return {
        // Returns toggl history with logged time
        getWorkLogAsync: function() {
            const period = {
                start: moment().subtract(settings.reportingRange),
                end: moment()
            };
            const periodExt = {
                start: moment().add(-365, 'd'),
                end: moment()
            };
            const taskLog = [];
            const deferred = new $.Deferred();

            togglService
                .getSummaryAsync(period, settings.toggl.useTimeEntryTitleAsComment)
                .fail(deferred.reject)
                .done(summary => {
                    togglService
                        .getSummaryAsync(periodExt, false)
                        .fail(deferred.reject)
                        .done(oneYearSummary => {
                            const tasks = _(summary).pluck('task');
                            jiraService
                                .getIssuesAsync(tasks)
                                .fail(deferred.reject)
                                .done(issues => this.processIssues(summary, oneYearSummary, issues, taskLog, deferred));
                        });
                });

            return deferred.promise();
        },
        processIssues(summary, oneYearSummary, issues, taskLog, deferred) {
            _(issues)
                .each(function(issue, i) {
                    setTimeout(function() {
                        const togglLog = _(summary).find(function(task) {
                            return issue.key === task.task;
                        });

                        if(!togglLog) {
                            // can be null if task was moved to another board after a toggl entry was added
                            alert('toggl entry for ' + issue.key + ' can\'t be found');
                            return;
                        } else {
                            const issueWorklogTask = jiraService.getIssueWorklogAsync(issue.key);
                            const oneYearTogglTime = oneYearSummary.find(t => t.task == issue.key);

                            // todo: pull toggl entries for more than one year if in jira we have more time
                            $
                                .when(issueWorklogTask)
                                .fail(deferred.reject)
                                .done(function(jiraTime) {

                                    const item = new SyncItem(
                                        togglLog.task,
                                        issue.fields.summary,
                                        oneYearTogglTime.time,
                                        jiraTime,
                                        settings.toggl.useTimeEntryTitleAsComment
                                            ? togglLog.comments
                                            : null);

                                    taskLog.push(item);

                                    if(taskLog.length === issues.length) {
                                        deferred.resolve(taskLog);
                                    }
                                });
                        }
                    }, settings.toggl.syncApiCall ? 200 * i : 0);
                });
        },
        syncAsync: function(itemToSync) {
            if(!(itemToSync.timeSpentSeconds > 0))
                throw new Error('Can log only positive time, Bad time value: ' + itemToSync.timeSpentSeconds);

            if(!itemToSync.logDate.isValid())
                throw new Error('Log date is required');

            return jiraService.logWorkAsync(itemToSync);
        },
        updateUnsyncedTaskCount: function(tasksCount) {
            const view = this;

            if(isNaN(tasksCount)) {
                view
                    .getWorkLogAsync()
                    .fail(function(xhr, status, error) {
                        chrome.browserAction.setBadgeText({text: '*' + xhr.status});
                        chrome.browserAction.setBadgeBackgroundColor({color: "black"});
                    })
                    .done(function(log) {
                        const count = _(log).filter((w) => w.unsynced > settings.timeToIgnoreSeconds).length;
                        const hasNegativeDiff = _(log).some((w) => w.unsynced < 0 && Math.abs(w.unsynced) > settings.timeToIgnoreSeconds);

                        let badgeColor = null;
                        if(hasNegativeDiff)
                            badgeColor = "orange";

                        view.setBadgeText(count, badgeColor);
                    });
            } else {
                view.setBadgeText(tasksCount);
            }
        },
        setBadgeText: function(count, badgeColor) {
            if(count > 0) {
                chrome.browserAction.setBadgeText({text: count.toString()});
                chrome.browserAction.setBadgeBackgroundColor({color: badgeColor || "red"});
            } else {
                chrome.browserAction.setBadgeText({text: '0'});
                chrome.browserAction.setBadgeBackgroundColor({color: badgeColor || "green"});
            }

            console.log('setBadgeText: ' + count);
        }
    };
});
