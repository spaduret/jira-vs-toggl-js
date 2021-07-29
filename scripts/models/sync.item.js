define(["settings", 'moment'], function (settings) {
    return function (taskName, taskDescription, togglTime, jiraTime, comment, error) {
        return {
            taskName: taskName || null,
            taskUrl: settings.jira.server + '/browse/' + taskName,
            taskDescription: taskDescription,
            togglTime: togglTime || null,
            jiraTime: jiraTime || null,
            get unsynced() {
                return (this.togglTime - this.jiraTime) || 0;
            },
            set unsynced(value) {
                throw new Error('\'unsynced\' is readonly property')
            },
            comment: comment,
            error: error
        };
    };
});
