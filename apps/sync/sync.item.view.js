define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    'sync.service',
    'jira.service',
    'settings',

    'text!../apps/sync/sync.item.template.html'
], function($, _, backbone, moment, syncService, jiraService, settings, template) {
    return backbone.View.extend({
        events: {
            'click [data-role=close]': 'delete',
            'click [data-role=cancel]': 'delete',
            'click [data-role=sync-item]': 'sync'
        },
        initialize: function(options) {
            this.options = options;
            this.render();
        },
        render: function() {
            this.$el.html(template);
            $('body').append(this.$el);
            const toLog = moment.duration(this.model.unsynced, 'second');
            this.$logTask = this.$('[data-role=logTask]');
            this.$logTime = this.$('[data-role=logTime]');
            this.$logDate = this.$('[data-role=logDate]');
            this.$comment = this.$('[data-role=comment]');

            this.$logTask.val(this.model.taskName);
            this.$logTime.val(`${toLog.hours()}h ${toLog.minutes()}m ${toLog.seconds()}s`);
            this.$logDate.val(this.model.logDate.format('YYYY-MM-DD'));
            this.$comment.val(this.model.comment);
        },
        validate: function() {
            const isValidDate = moment(this.$logDate.val()).isValid();
            const isValidTime = moment.duration(parseFloat(this.$logTime.val()), 'hour').isValid();
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
        delete: function() {
            this.$el.remove();
        }
    });
});
