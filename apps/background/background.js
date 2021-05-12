require(['../../scripts/config'], function() {
    require(['sync.service'], function(syncService) {
        // create alarm to fire every 5 minutes when extension is installed
        chrome.runtime.onInstalled.addListener(function() {
            chrome.alarms.create("jvt_refresh", {periodInMinutes: 5});
        });

        chrome.alarms.onAlarm.addListener(function(alarm) {
            syncService.updateUnsyncedTaskCount();
        });
    });
});
