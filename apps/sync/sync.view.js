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
                        order: [[0, 'asc']],
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
                                data: null,
                                render: view.renderTogglTime,
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
                        ],
                        drawCallback: function() {
                            let hasItemsToSync = _(view.workLog)
                                .some((row) => Math.abs(row.unsynced) > settings.timeToIgnoreSeconds && row.unsynced > -settings.timeToIgnoreSeconds);
                            view.$el.find('#sync-all').toggle(hasItemsToSync);
                        }
                    });
                    view.$el.find('#info').html(`work log summary for the last <b>${settings.reportingRange.asDays()}</b> day(s)`);
                    view.$el.find('#info').append(` <input id="sync-all" class="sync-all" style="display: none;" type="button" value="sync all ♥">`);
                    view.$el.find('#sync-all').click(() => view.syncAll());

                    //to show/hide 'sync-all' button
                    view.table.draw();
                });
        },
        renderTime: function(data) {
            const duration = moment.duration(data || 0, 'second');
            return `${duration.asHours() | 0}h ${duration.minutes()}m`;
        },
        renderMismatchTime: function(data) {
            let duration = Math.abs(data) <= settings.timeToIgnoreSeconds
                ? null
                : moment.duration(data || 0, 'second');

            if(duration) {
                const $anchor = $('<span/>', {
                    type: 'span',
                    class: 'mismatch',
                    text: `${duration.asHours() | 0}h ${duration.minutes()}m`,
                });

                return $anchor[0].outerHTML;
            }

            return null;
        },
        renderTogglTime: function(data) {
            const duration = moment.duration(data.togglTime || 0, 'second');
            const from = moment().add(-1, 'y').format('YYYY-MM-DD');
            const to = moment().format('YYYY-MM-DD');

            if(duration) {
                const $anchor = $('<a/>', {
                    type: 'a',
                    text: `${duration.asHours() | 0}h ${duration.minutes()}m`,
                    href: `https://toggl.com/app/reports/summary/${settings.workspaceId}/description/${data.taskName}/from/${from}/to/${to}/users/${settings.userId}`,
                    target: '_blank'
                });

                return $anchor[0].outerHTML;
            }

            return null;
        },
        renderTask: function(data, type, row) {
            return `<a href="${row.taskUrl}" target="_blank">${data}</a>`;
        },
        renderOptions: function(data, type, row, meta) {
            if(Math.abs(row.unsynced) <= settings.timeToIgnoreSeconds)
                return null;

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
        },
        syncAll: function() {
            let itemsToSync = _(this.workLog)
                .filter((row) => Math.abs(row.unsynced) > settings.timeToIgnoreSeconds && row.unsynced > -settings.timeToIgnoreSeconds);

            console.log(itemsToSync);
            new syncItemView({
                multi: true,
                //model: itemsToSync,
                table: this.table
            });
        }
    });
});
