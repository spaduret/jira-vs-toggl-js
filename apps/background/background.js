chrome.runtime.onInstalled.addListener(function() {
    require(['../../scripts/config'], function() {
        require(['sync.service', 'moment'], function(syncService, moment) {
            syncService.updateUnsyncedTaskCount();

            const intervalDuration = moment.duration(5, 'minutes');
            // run every X minutes
            if(!window.jvt_timer_id)
                window.jvt_timer_id = setInterval(function() {
                    syncService.updateUnsyncedTaskCount();
                }, intervalDuration.asMilliseconds());
        });
    });
});
