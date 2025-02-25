document.getElementById('understand-btn').addEventListener('click', function() {
    chrome.storage.sync.set({ 'hasSeenWelcome': true }, function() {
        window.close();
    });
});