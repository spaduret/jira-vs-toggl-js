define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    'sync.service',
    'settings',

    'text!../apps/sync/sync.item.template.html'
], function ($, _, backbone, moment, syncService, settings, template) {
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

            this.$logTask = this.$('[data-role=logTask]');
            this.$logTime = this.$('[data-role=logTime]');
            this.$logDate = this.$('[data-role=logDate]');
            this.$comment = this.$('[data-role=comment]');

            this.$logTask.val(this.model.taskName);
            this.$logTime.val(moment.duration(this.model.unsynced, 'minutes').asHours().toFixed(2) + 'h');
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
        sync: function() {
            const view = this;
            const isValid = view.validate();
            if(isValid) {
                const issue = {
                    taskName: view.model.taskName,
                    unsynced: parseFloat(view.$logTime.val()) * 60,
                    logDate: moment(view.$logDate.val()),
                    comment: view.$comment.val()
                };

                syncService
                    .syncAsync(issue)
                    .fail((xhr) => alert(xhr.responseText))
                    .done(function(result) {
                        if(_(result).has('timeSpentSeconds')) {
                            // update work log
                            view.model.jiraTime = Math.round(result.timeSpentSeconds / 60);

                            // update table
                            view.options.table
                                .row(view.options.row)
                                .data(view.model)
                                .draw();

                            view.delete();

                            const unSyncedCount = _(view.options.table.data())
                                .filter(function(row) {
                                    return Math.abs(row.unsynced) >= settings.timeToIgnoreMinutes;
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
