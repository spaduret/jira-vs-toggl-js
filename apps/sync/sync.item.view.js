define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    'sync.service',
    'jira.service',
    'settings',

    'text!../apps/sync/sync.item.template.html',
    'text!../apps/sync/sync.multiple.items.template.html',
], function(
    $,
    _,
    backbone,
    moment,
    syncService,
    jiraService,
    settings,

    template,
    multipleTemplate) {
    return backbone.View.extend({
        events: {
            'click [data-role=close]': 'delete',
            'click [data-role=cancel]': 'delete',
            'click [data-role=sync-item]': 'sync',
            'click [data-role=sync-all-items]': 'syncAll'
        },
        initialize: function(options) {
            this.options = options;
            this.render();
        },
        render: function() {
            if(this.options.multi)
                this.$el.html(multipleTemplate);
            else
                this.$el.html(template);
            $('body').append(this.$el);

            this.$logDate = this.$('[data-role=logDate]');
            this.$logTime = this.$('[data-role=logTime]');
            this.$comment = this.$('[data-role=comment]');
            this.$logDate.val(moment().format('YYYY-MM-DD'));

            if(!this.options.multi) {
                this.$logTask = this.$('[data-role=logTask]');
                this.$logTask.val(this.model.taskName);
                this.$comment.val(this.model.comment);
                const toLog = moment.duration(this.model.unsynced, 'second');
                this.$logTime.val(`${toLog.hours()}h ${toLog.minutes()}m ${toLog.seconds()}s`);
            }
        },
        validate: function() {
            const isValidDate = moment(this.$logDate.val()).isValid();
            const isValidTime = this.options.multi || moment.duration(parseFloat(this.$logTime.val()), 'hour').isValid();
            const isValidComment = _.isBetween(this.$comment.val().length, 0, 255);

            this.$logTime.toggleClass('error', !isValidTime);
            this.$logDate.toggleClass('error', !isValidDate);
            this.$comment.toggleClass('error', !isValidComment);

            return isValidComment && isValidDate && isValidTime;
        },
        parseTime: function(time) {
            const duration = moment.duration();
            _(time.split(' '))
                .each((t) => {
                    const timeValue = _.initial(t).join("");
                    const dur = _.last(t);
                    duration.add(parseInt(timeValue), dur);
                });

            if(duration.isValid() && duration.asSeconds() > 0)
                return duration;

            return null;
        },
        sync: function() {
            const view = this;
            const isValid = view.validate();
            if(isValid) {
                const toLog = view.$logTime.val();
                const duration = this.parseTime(toLog);
                if(!duration) {
                    alert('Bad time format');
                    return;
                }

                const issue = {
                    taskName: view.model.taskName,
                    timeSpentSeconds: duration.asSeconds(),
                    logDate: moment(view.$logDate.val()),
                    comment: view.$comment.val()
                };

                this.loading();
                syncService
                    .syncAsync(issue)
                    .fail((xhr) => alert(xhr.responseText))
                    .then(() => jiraService.getIssueWorklogAsync(issue.taskName))
                    .done(function(jiraTime) {
                        if(jiraTime) {
                            //log trace info
                            console.log({
                                task: issue.taskName,
                                jiraTime: view.model.jiraTime,
                                togglTime: view.model.togglTime,
                                diff: view.model.unsynced,
                                toLog: issue.timeSpentSeconds,
                                afterSync: jiraTime
                            });
                            // update work log
                            view.model.jiraTime = jiraTime;

                            // update table
                            view.options.table
                                .row(view.options.row)
                                .data(view.model)
                                .draw();

                            view.delete();

                            const unSyncedCount = _(view.options.table.data())
                                .filter(function(row) {
                                    return Math.abs(row.unsynced) >= settings.timeToIgnoreSeconds;
                                })
                                .length;

                            syncService.updateUnsyncedTaskCount(unSyncedCount);
                        } else {
                            // todo: show error
                            view.$el.toggleClass('error', true);
                        }
                    });
            }
        },
        syncAll: function() {
            const view = this;
            const isValid = view.validate();
            if(isValid) {
                let synced = [];
                const deferred = new $.Deferred();

                const itemsToSync = _(view.options.table.data())
                    .filter((row) => Math.abs(row.unsynced) > settings.timeToIgnoreSeconds &&
                        row.unsynced > -settings.timeToIgnoreSeconds);

                this.loading();
                _(itemsToSync)
                    .each((task) => {
                        const comment = view.$comment.val();

                        const syncItem = {
                            taskName: task.taskName,
                            timeSpentSeconds: moment.duration(task.unsynced, 'second').asSeconds(),
                            logDate: moment(view.$logDate.val()),
                            comment: comment
                                ? comment
                                //use default comment from task
                                //will have a value if [useTimeEntryTitleAsComment] setting is enabled
                                : task.comment
                        };

                        syncService
                            .syncAsync(syncItem)
                            .fail((xhr) => deferred.reject(xhr.responseText))
                            .then(() => jiraService.getIssueWorklogAsync(syncItem.taskName))
                            .then((jiraTime) => {
                                if(jiraTime) {
                                    //log trace info
                                    console.log({
                                        task: syncItem.taskName,
                                        jiraTime: syncItem.jiraTime,
                                        togglTime: syncItem.togglTime,
                                        diff: syncItem.unsynced,
                                        toLog: syncItem.timeSpentSeconds,
                                        afterSync: jiraTime
                                    });

                                    task.jiraTime = jiraTime;
                                    synced.push(task);
                                    if(synced.length === itemsToSync.length)
                                        deferred.resolve(synced);
                                } else
                                    deferred.reject(`failed to sync time for task ${task.taskName}`);
                            });
                    });

                deferred
                    .promise()
                    .fail((error) => alert(error))
                    .done(syncedItems => {
                        _(syncedItems)
                            .each((item) => {
                                //find row
                                let row = view.options.table.rows((index, data) => data.taskName === item.taskName)[0];
                                // update table
                                view.options.table
                                    .row(row)
                                    .data(item)
                                    .draw();
                            });

                        view.delete();

                        // should be 0
                        const unSyncedCount = _(view.options.table.data())
                            .filter(function(row) {
                                return Math.abs(row.unsynced) >= settings.timeToIgnoreSeconds;
                            })
                            .length;

                        syncService.updateUnsyncedTaskCount(unSyncedCount);
                    });
            }
        },
        loading: function() {
            this.$el.find('.general-popup__container')
                .addClass('g-loading')
                .append('<a data-role="g-loading"></a>');
        },
        delete: function() {
            this.$el.remove();
        }
    });
});
