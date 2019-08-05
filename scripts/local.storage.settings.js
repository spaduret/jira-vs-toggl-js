define(['settings.config', 'moment'], function(settingsConfig, moment) {
    'use strict';

    return {
        get jira() {
            return JSON.parse(window.localStorage.getItem(settingsConfig.jira)) || {};
        },
        set jira(settings) {
            window.localStorage.setItem(settingsConfig.jira, JSON.stringify(settings));
        },
        get toggl() {
            return JSON.parse(window.localStorage.getItem(settingsConfig.toggl)) || {};
        },
        set toggl(settings) {
            window.localStorage.setItem(settingsConfig.toggl, JSON.stringify(settings));
        },
        get reportingRange() {
            const storedValue = moment.duration(parseInt(window.localStorage.getItem(settingsConfig.reportingRange)), 'days');
            return storedValue.isValid()
                ? storedValue
                : moment.duration(1, 'days');
        },
        set reportingRange(days) {
            const intDays = parseInt(days.toString());
            if(intDays <= 0)
                throw new Error('Bad duration value: ' + days);

            const duration = moment.duration(intDays, 'days');
            if(!duration.isValid())
                throw new Error('Bad duration value: ' + days);

            window.localStorage.setItem(settingsConfig.reportingRange, duration.asDays());
        },
        get timeToIgnoreSeconds() {
            return 30
        }
    };
});
