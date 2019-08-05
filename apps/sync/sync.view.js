define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    'settings',
    'sync.service',
    'sync.item.view'
], function(
    $,
    _,
    backbone,
    moment,
    settings,
    syncService,
    syncItemView) {
    'use strict';
    return backbone.View.extend({
        el: 'body',
        events: {
            'click [data-role="sync"]': 'onSync'
        },
        initialize: function() {
            this.$table = this.$('#workLog');
            this.render();
        },
        render: function() {
            const view = this;
            syncService
                .getWorkLogAsync()
                .fail(function(xhr, status, error) {
                    alert(xhr.responseText);
                    chrome.browserAction.setBadgeText({text: '*' + xhr.status});
                    chrome.browserAction.setBadgeBackgroundColor({color: "black"});
                })
                .done(function(workLog) {
                    view.workLog = workLog;

                    view.table = view.$table.DataTable({
                        dom: "<i<'#info.dataTables_info'>>t",
                        data: view.workLog,
                        fixedHeader: true,
                        paging: false,
                        searching: false,
                        ordering: true,
                        info: true,
                        order: [[4, 'desc'], [0, 'asc']],
                        columns: [
                            {
                                title: 'Task',
                                data: 'taskName',
                                className: 'dt-center',
                                render: view.renderTask,
                                width: '80px'
                            },
                            {title: 'Description', data: 'taskDescription', orderable: false},
                            {
                                title: 'Toggl',
                                data: 'togglTime',
                                render: view.renderTime,
                                className: 'dt-center',
                                searchable: false,
                                width: '50px'
                            },
                            {
                                title: 'Jira',
                                data: 'jiraTime',
                                render: view.renderTime,
                                className: 'dt-center',
                                searchable: false,
                                width: '50px'
                            },
                            {
                                title: 'Mismatch',
                                data: 'unsynced',
                                render: view.renderMismatchTime,
                                className: 'dt-center',
                                searchable: false
                            },
                            {
                                title: 'Sync',
                                data: 'taskName',
                                render: view.renderOptions,
                                className: 'dt-center',
                                orderable: false,
                                searchable: false
                            }
                        ]
                    });
                    view.$el.find('#info').html(`work log summary for the last <b>${settings.reportingRange.asDays()}</b> day(s)`);
                });
        },
        renderTime: function(data) {
            const duration = moment.duration(data || 0, 'second');
            return `${Math.floor(duration.asHours())}h ${duration.minutes()}m`;
        },
        renderMismatchTime: function(data) {
            let duration = Math.abs(data) < settings.timeToIgnoreSeconds
                ? null
                : moment.duration(data || 0, 'second');

            if(duration) {
                const $anchor = $('<span/>', {
                    type: 'span',
                    class: 'mismatch',
                    text: `${Math.floor(duration.asHours())}h ${duration.minutes()}m`,
                });

                return $anchor[0].outerHTML;
            }

            return null;
        },
        // todo
        renderTogglTime: function(data) {
            let duration = Math.abs(data) < settings.timeToIgnoreMinutes
                ? null
                : moment.duration(data || 0, 'm');

            if(duration) {
                const $anchor = $('<a/>', {
                    type: 'a',
                    text: `${Math.floor(duration.asHours())}h ${duration.minutes()}m`,
                    //href: 'https://toggl.com/app/reports/detailed/617655/description/CCM-1882%20Usage%20Report/from/2018-04-22/to/2019-04-22/users/996236',
                    //target: '_blank'
                });

                return $anchor[0].outerHTML;
            }

            return null;
        },
        renderTask: function(data, type, row) {
            return `<a href="${row.taskUrl}" target="_blank">${data}</a>`;
        },
        renderOptions: function(data, type, row, meta) {
            if(Math.abs(row.unsynced) < settings.timeToIgnoreSeconds) return null;

            const $button = $('<button/>', {
                type: 'button',
                text: 'sync',
                'data-issue': data,
                'data-row': meta.row,
                'data-role': 'sync'
            });

            // show RED if jira has more logged work
            if(row.unsynced < -settings.timeToIgnoreSeconds) {
                $button
                    .css({color: '#FF0000'})
                    .attr('disabled', 'disabled');
            }

            return $button[0].outerHTML;
        },
        onSync: function(event) {
            const $target = $(event.currentTarget);
            const data = $target.data();
            const itemToSync = _(this.workLog).find({taskName: data.issue});

            new syncItemView({
                model: itemToSync,
                table: this.table,
                row: data.row
            });
        }
    });
});
