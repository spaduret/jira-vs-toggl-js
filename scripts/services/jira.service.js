define([
    'jquery',
    'underscore',
    'moment',
    'settings'
], function($, _, moment, settings) {
    'use strict';

    const authToken = btoa(settings.jira.email + ':' + settings.jira.apiToken);

    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Atlassian-Token': 'no-check',
        'Authorization': 'Basic ' + authToken
    };

    // getting Jira Base URL
    let jiraBaseUrl = settings.jira.server;
    if (!jiraBaseUrl)
        throw new Error('Not found Jira Server URL configuration.');
    if (jiraBaseUrl[jiraBaseUrl.length - 1] === '/') {
        jiraBaseUrl = jiraBaseUrl.substr(0, jiraBaseUrl.length - 1);
    }
    const apiVersion = '2';
    const urls = {
        mypermissions: jiraBaseUrl + '/rest/api/' + apiVersion + '/mypermissions',
        issue: jiraBaseUrl + '/rest/api/' + apiVersion + '/issue/',
        logWork: jiraBaseUrl + '/rest/api/' + apiVersion + '/issue/{0}/worklog',
        issues: jiraBaseUrl + '/rest/api/' + apiVersion + '/search?jql={0}&fields=id,key,summary&maxResults=100',
        fields: jiraBaseUrl + '/rest/api/' + apiVersion + '/field',
        worklog: jiraBaseUrl + '/rest/api/' + apiVersion + '/issue/{0}/worklog'
    };

    return {
        settings: settings.jira,
        getIssuesAsync: function(issues) {
            if(!issues.length) {
                const deferred = new $.Deferred();
                deferred.resolve([]);

                return deferred.promise();
            }

            let jql = "key=";
            jql += issues.join("+OR+key=");

            return $.ajax({
                url: urls.issues.replace('{0}', jql),
                headers: headers,
                type: 'GET',
                async: true
            }).then(function(response) {
                // todo: consider to pull more results if available
                if(response.total > response.maxResults)
                    throw new Error('More jira issues available');

                return response.issues;
            });
        },
        getIssueWorklogAsync: function(issueKey) {
            const settings = this.settings;

            return $.ajax({
                url: urls.worklog.replace('{0}', issueKey),
                headers: headers,
                type: 'GET',
                async: true
            }).then(function(response) {
                return _(response.worklogs)
                    .filter((w) => w.author.emailAddress === settings.email)
                    .reduce((memo, log) => memo + log.timeSpentSeconds, 0);
            });
        },
        getFields: function() {
            let result = null;

            $.ajax({
                url: urls.fields,
                headers: headers,
                type: 'GET',
                async: true
            }).done(function(response) {
                result = response;
            });

            return result;
        },
        logWorkAsync: function(issue) {
            return $.ajax({
                url: urls.logWork.replace('{0}', issue.taskName),
                headers: headers,
                type: 'POST',
                dataType: 'JSON',
                async: true,
                data: JSON.stringify({
                    started: issue.logDate.format('YYYY-MM-DDTHH:mm:ss.SSS-1200'),
                    comment: issue.comment,
                    timeSpentSeconds: Math.round(issue.timeSpentSeconds)
                })
            });
        }
    };
});
