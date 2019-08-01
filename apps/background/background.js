chrome.runtime.onInstalled.addListener(function () {
    require(['../../scripts/config'], function () {
        require(['sync.service', 'moment'], function (syncService, moment) {
                syncService.updateUnsyncedTaskCount();

                const intervalDuration = moment.duration(5, 'min');
                // run every X minutes
                const timerId = setInterval(function() {
                    syncService.updateUnsyncedTaskCount();
                }, intervalDuration.asMilliseconds());
        });
    });
});
