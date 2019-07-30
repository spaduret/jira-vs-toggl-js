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
        initialize: function (options) {
            this.options = options;
            this.render();
        },
        render: function () {

            this.$el.html(template);
            $('body').append(this.$el);

            this.$comment = this.$('[data-role=comment]');
            this.$comment.val(this.model.comment);
            this.$logDate = this.$('[data-role=logDate]');
            this.$logDate.val(this.model.logDate.format('YYYY-MM-DD'));
        },
        validate: function () {
            const isValidDate = moment(this.$logDate.val()).isValid();
            const isValidComment = _.isBetween(this.$comment.val().length, 0, 255);

            this.$logDate.toggleClass('error', !isValidDate);
            this.$comment.toggleClass('error', !isValidComment);

            return isValidComment && isValidDate;
        },
        sync: function () {
            const isValid = this.validate();
            if (isValid) {
                this.model.comment = this.$comment.val();
                this.model.logDate = moment(this.$logDate.val());

                let result = syncService.sync(this.model);
                 if (_(result).has('timeSpentSeconds')) {
                     // update work log
                     this.model.jiraTime = Math.round(result.timeSpentSeconds / 60);

                     // update table
                     this.options.table
                         .row(this.options.row)
                         .data(this.model)
                         .draw();

                     this.delete();

                     const unSyncedCount = _(this.options.table.data())
                         .filter(function (row) {
                             return Math.abs(row.unsynced) >= settings.timeToIgnoreMinutes;
                         })
                         .length;

                     syncService.updateUnsyncedTaskCount(unSyncedCount);
                 }
                 else {
                     // todo: show error
                     this.$el.toggleClass('error', true);
                 }
            }
        },
        delete: function () {
            this.$el.remove();
        }
    });
});
