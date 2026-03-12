document.addEventListener('DOMContentLoaded', () => {
    
    // Hafızadan kullanıcının belirlediği tema rengini çek ve CSS değişkenine uygula
    chrome.storage.sync.get(['accentColor'], (data) => {
        if (data.accentColor) {
            document.documentElement.style.setProperty('--mt-accent', data.accentColor);
        }
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerText = chrome.i18n.getMessage(el.getAttribute('data-i18n')) || el.getAttribute('data-i18n');
    });

    const tabHist = document.getElementById('tabHist');
    const tabBook = document.getElementById('tabBook');
    const listHist = document.getElementById('listHist');
    const listBook = document.getElementById('listBook');
    const settingsBtn = document.getElementById('settingsBtn');

    settingsBtn.title = chrome.i18n.getMessage("btnSettings") || "Settings";
    settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    tabHist.onclick = () => {
        tabHist.className = 'tab active'; tabBook.className = 'tab';
        listHist.className = 'list active'; listBook.className = 'list';
    };
    
    tabBook.onclick = () => {
        tabBook.className = 'tab active'; tabHist.className = 'tab';
        listBook.className = 'list active'; listHist.className = 'list';
    };

    function renderList(storageKey, listEl, isBookmark) {
        chrome.storage.local.get([storageKey], (data) => {
            const items = data[storageKey] || [];
            if (items.length === 0) {
                listEl.innerHTML = `<div class="empty">${chrome.i18n.getMessage("historyEmpty") || "Empty"}</div>`;
                return;
            }
            listEl.innerHTML = '';
            items.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'history-item';
                
                const header = document.createElement('div');
                header.className = 'item-header';
                header.innerHTML = `<div class="title">${item.domain}</div>`;
                
                if (isBookmark) {
                    const del = document.createElement('div');
                    del.className = 'delete-btn'; del.innerHTML = '×';
                    del.onclick = (e) => {
                        e.stopPropagation();
                        items.splice(index, 1);
                        chrome.storage.local.set({ [storageKey]: items }, () => renderList(storageKey, listEl, true));
                    };
                    header.appendChild(del);
                }

                const url = document.createElement('div');
                url.className = 'url'; url.innerText = item.url;

                li.appendChild(header); li.appendChild(url);
                li.onclick = () => chrome.tabs.create({ url: item.url });
                listEl.appendChild(li);
            });
        });
    }

    renderList('miniTabHistory', listHist, false);
    renderList('miniTabBookmarks', listBook, true);
});