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
    } else if (request.action === 'prepareUrl') {
        // MİNİTAB AÇILMADAN HEMEN ÖNCE TETİKLENİR
        const tabId = sender.tab ? sender.tab.id : null;
        if (!tabId) { sendResponse({success: false}); return true; }
        
        try {
            const urlObj = new URL(request.url);
            const domain = urlObj.hostname.replace('www.', '');

            let requestDomains = [domain];
            // YouTube videoları için özel kural
            if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
                requestDomains.push('googlevideo.com');
                requestDomains.push('youtube.com');
            }

            // Sadece aktif sekmeye özel eşsiz kural ID'leri
            const ruleId1 = tabId * 2;
            const ruleId2 = tabId * 2 + 1;

            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [ruleId1, ruleId2],
                addRules: [
                    {
                        "id": ruleId1,
                        "priority": 1,
                        "action": {
                            "type": "modifyHeaders",
                            "responseHeaders": [
                                { "header": "x-frame-options", "operation": "remove" },
                                { "header": "content-security-policy", "operation": "remove" },
                                { "header": "cross-origin-embedder-policy", "operation": "remove" },
                                { "header": "cross-origin-opener-policy", "operation": "remove" },
                                { "header": "cross-origin-resource-policy", "operation": "remove" }
                            ]
                        },
                        "condition": {
                            "tabIds": [tabId],
                            "requestDomains": requestDomains, // SADECE AÇILACAK LİNKİN GÜVENLİĞİNİ DELER!
                            "resourceTypes": ["sub_frame", "xmlhttprequest", "media"]
                        }
                    },
                    {
                        "id": ruleId2,
                        "priority": 2,
                        "action": {
                            "type": "modifyHeaders",
                            "requestHeaders": [
                                { "header": "Origin", "operation": "set", "value": "https://www.youtube.com" },
                                { "header": "Referer", "operation": "set", "value": "https://www.youtube.com/" }
                            ]
                        },
                        "condition": {
                            "tabIds": [tabId],
                            "requestDomains": ["googlevideo.com", "youtube.com"],
                            "resourceTypes": ["xmlhttprequest", "media"]
                        }
                    }
                ]
            }, () => {
                sendResponse({success: true});
            });
            return true; 
        } catch(e) {
            sendResponse({success: false});
            return true;
        }
    }
});

// Sekme kapandığında güvenlik kurallarını temizle
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [tabId * 2, tabId * 2 + 1]
    });
});