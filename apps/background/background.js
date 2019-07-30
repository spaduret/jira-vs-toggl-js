chrome.runtime.onInstalled.addListener(function () {
    require(['../../scripts/config'], function () {
        require(['sync.service'], function (syncService) {
            const timerId = syncService.timerSetup();
        });
    });
});