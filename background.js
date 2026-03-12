chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openOptions') {
        chrome.runtime.openOptionsPage();
    } else if (request.action === 'openTab') {
        chrome.tabs.create({ url: request.url });
    } else if (request.action === 'takeScreenshot') {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
            sendResponse({dataUrl: dataUrl});
        });
        return true; 
    }
});