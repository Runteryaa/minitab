// ==========================================
// --- KİMLİK BELİRLEME (FRAME IDENTIFICATION) ---
// ==========================================
const isTop = (window === window.top);
const isMiniTab = (window.name === 'minitab-iframe');

// Ortak Ayarlar
let prefs = {
    useTabs: true, searchEngine: 'google', themePref: 'dark', accentColor: '#4da6ff',
    triggerLongClick: true, longClickTime: 500, triggerLongHover: false, triggerHoverSpace: false, 
    triggerDragLink: false, triggerAltClick: true, triggerCtrlShiftClick: false,
    closeOutside: true, closeMouseLeave: false, closeScroll: false
};

if (!isMiniTab) {
    chrome.storage.sync.get(prefs, (data) => { Object.assign(prefs, data); updateThemeCSS(); });
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') { for (let key in changes) prefs[key] = changes[key].newValue; updateThemeCSS(); }
    });
}

// ==========================================
// --- CSS ENJEKSİYONU ---
// ==========================================
const themeStyles = document.createElement('style');
if (!isMiniTab) {
    if (document.head) document.head.appendChild(themeStyles);
    else document.documentElement.appendChild(themeStyles);
}

function updateThemeCSS() {
    if (isMiniTab) return;
    const isDark = prefs.themePref === 'dark';
    const bg = isDark ? '#1e1e1e' : '#ffffff';
    const panel = isDark ? '#252525' : '#f0f0f0';
    const inputBg = isDark ? '#111111' : '#e0e0e0';
    const border = isDark ? '#333333' : '#d0d0d0';
    const text = isDark ? '#ffffff' : '#111111';
    const textMuted = isDark ? '#aaaaaa' : '#666666';
    const hoverBg = isDark ? '#333333' : '#dcdcdc';
    const accent = prefs.accentColor;

    let css = `
        :root { 
            --mt-bg: ${bg}; --mt-panel: ${panel}; --mt-input: ${inputBg}; 
            --mt-border: ${border}; --mt-text: ${text}; --mt-text-muted: ${textMuted}; 
            --mt-hover: ${hoverBg}; --mt-accent: ${accent}; 
        }
        .minitab-progress-indicator {
            position: fixed; width: 32px; height: 32px; 
            border: 2px solid var(--mt-accent); border-radius: 50%; 
            pointer-events: none; z-index: 2147483647; 
            opacity: 0; transition: opacity 0.15s ease; 
            display: flex; align-items: center; justify-content: center; 
            transform: translate(-50%, -50%); box-sizing: border-box;
            background: rgba(0, 0, 0, 0.15); backdrop-filter: blur(2px);
        }
        .minitab-progress-dot {
            width: 100%; height: 100%; 
            background-color: var(--mt-accent); border-radius: 50%; 
            transform: scale(0); opacity: 0.4; transform-origin: center center;
        }
    `;

    if (isTop) {
        css += `
            .minitab-btn { background: none; border: none; color: var(--mt-text-muted); cursor: pointer; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.1s, color 0.1s, transform 0.1s; }
            .minitab-btn svg { pointer-events: none; } 
            .minitab-btn:hover { color: var(--mt-text); background: var(--mt-hover); }
            .minitab-btn:active, .minitab-btn.clicked { color: var(--mt-accent) !important; transform: scale(0.85); }
            .minitab-container { transition: top 0.15s, left 0.15s, width 0.15s, height 0.15s; }
            .minitab-tab { background-color: var(--mt-input); color: var(--mt-text-muted); padding: 6px 12px; border-radius: 8px 8px 0 0; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; border: 1px solid var(--mt-border); border-bottom: none; max-width: 160px; height: 28px; transition: background 0.1s, color 0.1s; flex-shrink: 0; }
            .minitab-tab:hover { color: var(--mt-accent); }
            .minitab-tab-active { background-color: var(--mt-panel); color: var(--mt-accent); border-top: 2px solid var(--mt-accent); }
            .minitab-input { background-color: var(--mt-input); color: var(--mt-text-muted); border: 1px solid var(--mt-border); outline: none; transition: all 0.1s; }
            .minitab-input:focus { background-color: var(--mt-bg); color: var(--mt-text); border-color: var(--mt-accent); box-shadow: 0 0 5px var(--mt-accent); }
            .minitab-auto-close-bar { position: absolute; bottom: 0; left: 0; height: 4px; background-color: var(--mt-accent); width: 100%; transition: width 3s linear; transform-origin: left; opacity: 0; pointer-events: none; z-index: 9999; }
        `;
    }
    themeStyles.innerHTML = css;
}

// ==========================================
// --- SADECE IFRAME'LER İÇİN İLETİŞİM ---
// ==========================================
if (!isTop && !isMiniTab) {
    let currentIframeUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentIframeUrl) {
            currentIframeUrl = window.location.href;
            window.top.postMessage({ type: 'MINITAB_URL_UPDATED', url: currentIframeUrl }, '*');
        }
    }, 500);
}

if (isMiniTab) {
    let muteObserver = null;
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'MINITAB_MUTE') {
            const applyMute = (state) => { document.querySelectorAll('video, audio').forEach(media => media.muted = state); };
            applyMute(e.data.state);
            if (e.data.state) {
                if (!muteObserver) { muteObserver = new MutationObserver(() => applyMute(true)); muteObserver.observe(document.documentElement, { childList: true, subtree: true }); }
            } else {
                if (muteObserver) { muteObserver.disconnect(); muteObserver = null; }
            }
        }
        if (e.data && e.data.type === 'MINITAB_REQ_URL') {
            e.source.postMessage({ type: 'MINITAB_RES_URL', url: window.location.href }, '*');
        }
    });
}

// ==========================================
// --- ANA SAYFA (TOP WINDOW) MOTORU ---
// ==========================================
let triggerMiniTab = function() {}; 
let activePopups = []; 

if (isTop) {
    const icons = {
        pin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>`,
        bookmark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`,
        screenshot: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
        share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
        unmute: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
        mute: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="1" x2="1" y2="23"></line></svg>`,
        openNewTab: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
        fullscreen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"></path></svg>`,
        halfscreen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>`,
        zoomIn: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`,
        zoomOut: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`,
        settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
        close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    };

    function getDomain(url) { try { return new URL(url).hostname.replace('www.', ''); } catch(e) { return chrome.i18n.getMessage("linkConnection") || "Link"; } }
    let savedWindowPrefs = { top: '10vh', left: '15vw', width: '65vw', height: '75vh' };
    chrome.storage.local.get(['windowPrefs'], (data) => { if (data.windowPrefs) Object.assign(savedWindowPrefs, data.windowPrefs); });
    let prefsTimeout;
    function saveWindowPrefs(newPrefs) {
        Object.assign(savedWindowPrefs, newPrefs);
        clearTimeout(prefsTimeout);
        prefsTimeout = setTimeout(() => chrome.storage.local.set({ windowPrefs: savedWindowPrefs }), 500);
    }

    // Ana pencere: Diğer sayfalardan gelen mesajları dinler
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'MINITAB_OPEN') {
            triggerMiniTab(e.data.url);
        }
        if (e.data && e.data.type === 'MINITAB_CLOSE_OUTSIDE') {
            if (prefs.closeOutside) activePopups.forEach(p => { if (!p.isPinned) p.close(); });
        }
        if (e.data && e.data.type === 'MINITAB_RES_URL') {
            chrome.runtime.sendMessage({ action: 'openTab', url: e.data.url });
            activePopups.forEach(p => { if (p.waitingForUrl) { p.waitingForUrl = false; p.close(); } });
        }
        if (e.data && e.data.type === 'MINITAB_URL_UPDATED') {
            const newUrl = e.data.url;
            activePopups.forEach(popup => {
                if (popup.tabs && popup.tabs.length > 0) {
                    popup.tabs.forEach(t => {
                        if (t.iframeEl && t.iframeEl.contentWindow === e.source) {
                            t.url = newUrl;
                            if (t.titleSpan) t.titleSpan.innerText = getDomain(newUrl); 
                            if (popup.activeTabId === t.id && popup.urlInput) {
                                popup.urlInput.value = newUrl;
                                if (popup.updateBookmarkIcon) popup.updateBookmarkIcon(newUrl);
                            }
                        }
                    });
                } else if (popup.singleIframe && popup.singleIframe.contentWindow === e.source) {
                    if (popup.urlInput) popup.urlInput.value = newUrl;
                    if (popup.updateBookmarkIcon) popup.updateBookmarkIcon(newUrl);
                }
            });
        }
    });

    function saveToHistory(url) {
        chrome.storage.local.get(['miniTabHistory'], (data) => {
            let hist = data.miniTabHistory || [];
            if (hist.length > 0 && hist[0].url === url) return;
            hist.unshift({ url: url, domain: getDomain(url), time: Date.now() });
            if (hist.length > 10) hist = hist.slice(0, 10); 
            chrome.storage.local.set({ miniTabHistory: hist });
        });
    }

    triggerMiniTab = function(url) {
        if (!url) return;
        saveToHistory(url); 
        if (prefs.useTabs) {
            let mainPopup = activePopups[0]; 
            if (!mainPopup) { mainPopup = createPopupWindow(url, true); activePopups.push(mainPopup); }
            else { if (mainPopup.isPinned) mainPopup.addTab(url); else mainPopup.updateActiveTab(url); }
        } else {
            let unpinnedPopup = activePopups.find(p => !p.isPinned);
            if (unpinnedPopup) unpinnedPopup.updateSingleURL(url);
            else { const newPopup = createPopupWindow(url, false); activePopups.push(newPopup); }
        }
    };

    const createBtn = (icon, title, onClick, useMousedown = true) => {
        const btn = document.createElement('button'); 
        btn.innerHTML = icon; btn.title = title; btn.className = 'minitab-btn';
        const handler = (e) => {
            e.preventDefault(); e.stopPropagation();
            btn.classList.add('clicked');
            setTimeout(() => btn.classList.remove('clicked'), 150);
            onClick.call(btn, e);
        };
        if (useMousedown) btn.addEventListener('mousedown', handler);
        else btn.addEventListener('click', handler);
        return btn;
    };

    function createPopupWindow(initialUrl, isTabbedMode) {
        const popup = { isPinned: false, isMuted: false, waitingForUrl: false, currentZoom: 1, tabs: [], activeTabId: null, tabCounter: 0 };

        popup.container = document.createElement('div');
        popup.container.className = 'minitab-container';
        popup.container.style.cssText = `position: fixed; top: ${savedWindowPrefs.top}; left: ${savedWindowPrefs.left}; width: ${savedWindowPrefs.width}; height: ${savedWindowPrefs.height}; z-index: 2147483647; display: flex; flex-direction: row; gap: 10px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; resize: both; overflow: hidden; border-radius: 10px;`;

        if (activePopups.length > 0 && !isTabbedMode) {
            const offset = activePopups.length * 30;
            popup.container.style.top = `calc(${savedWindowPrefs.top} + ${offset}px)`; popup.container.style.left = `calc(${savedWindowPrefs.left} + ${offset}px)`;
        }

        const sidebar = document.createElement('div');
        sidebar.style.cssText = `display: flex; flex-direction: column; align-items: center; gap: 8px; width: 44px; padding: 10px 0; background-color: var(--mt-panel); backdrop-filter: blur(10px); border: 2px solid var(--mt-accent); border-radius: 22px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); height: fit-content; margin-top: 40px;`;

        const pinBtn = createBtn(icons.pin, chrome.i18n.getMessage("btnPin") || "Pin", function() { 
            popup.isPinned = !popup.isPinned; this.style.color = popup.isPinned ? 'var(--mt-accent)' : ''; 
        });

        popup.updateBookmarkIcon = (url) => {
            chrome.storage.local.get(['miniTabBookmarks'], (data) => {
                const marks = data.miniTabBookmarks || [];
                if (marks.find(m => m.url === url)) { bookmarkBtn.style.color = 'var(--mt-accent)'; bookmarkBtn.querySelector('svg').style.fill = 'var(--mt-accent)'; } 
                else { bookmarkBtn.style.color = ''; bookmarkBtn.querySelector('svg').style.fill = 'none'; }
            });
        };

        const bookmarkBtn = createBtn(icons.bookmark, chrome.i18n.getMessage("btnBookmark") || "Bookmark", function() {
            const currentUrl = isTabbedMode ? popup.tabs.find(t => t.id === popup.activeTabId)?.url : popup.urlInput.value;
            if (!currentUrl) return;
            chrome.storage.local.get(['miniTabBookmarks'], (data) => {
                let marks = data.miniTabBookmarks || [];
                const exists = marks.find(m => m.url === currentUrl);
                if (exists) {
                    marks = marks.filter(m => m.url !== currentUrl);
                    this.style.color = ''; this.querySelector('svg').style.fill = 'none';
                } else {
                    marks.unshift({ url: currentUrl, domain: getDomain(currentUrl), time: Date.now() });
                    this.style.color = 'var(--mt-accent)'; this.querySelector('svg').style.fill = 'var(--mt-accent)';
                }
                chrome.storage.local.set({ miniTabBookmarks: marks });
            });
        });
        
        const screenshotBtn = createBtn(icons.screenshot, chrome.i18n.getMessage("btnScreenshot") || "Screenshot", function() {
            const prevColor = this.style.color;
            this.style.color = 'var(--mt-accent)'; 
            const rect = popup.iframeWrapper.getBoundingClientRect();
            const dpr = window.devicePixelRatio;
            chrome.runtime.sendMessage({ action: 'takeScreenshot' }, (response) => {
                if (response && response.dataUrl) {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = rect.width * dpr;
                        canvas.height = rect.height * dpr;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr, 0, 0, rect.width * dpr, rect.height * dpr);
                        const a = document.createElement('a');
                        a.download = `MiniTab_Snap_${Date.now()}.png`;
                        a.href = canvas.toDataURL('image/png');
                        a.click();
                        this.style.color = prevColor;
                    };
                    img.src = response.dataUrl;
                } else { this.style.color = prevColor; }
            });
        }, false); 

        const muteBtn = createBtn(icons.unmute, chrome.i18n.getMessage("btnMute") || "Mute", function() {
            popup.isMuted = !popup.isMuted;
            this.innerHTML = popup.isMuted ? icons.mute : icons.unmute;
            this.title = popup.isMuted ? (chrome.i18n.getMessage("btnUnmute") || "Unmute") : (chrome.i18n.getMessage("btnMute") || "Mute");
            this.style.color = popup.isMuted ? 'var(--mt-accent)' : '';
            const msg = { type: 'MINITAB_MUTE', state: popup.isMuted };
            if (isTabbedMode) popup.tabs.forEach(t => t.iframeEl.contentWindow.postMessage(msg, '*'));
            else if (popup.singleIframe) popup.singleIframe.contentWindow.postMessage(msg, '*');
        });

        const openNewTabBtn = createBtn(icons.openNewTab, chrome.i18n.getMessage("btnOpenNewTab") || "Open in New Tab", () => {
            const activeIframe = isTabbedMode ? popup.tabs.find(t => t.id === popup.activeTabId)?.iframeEl : popup.singleIframe;
            if (activeIframe) {
                popup.waitingForUrl = true; 
                activeIframe.contentWindow.postMessage({ type: 'MINITAB_REQ_URL' }, '*');
                setTimeout(() => {
                    if (popup.waitingForUrl) {
                        popup.waitingForUrl = false;
                        const fallbackUrl = isTabbedMode ? popup.tabs.find(t => t.id === popup.activeTabId)?.url : popup.urlInput.value;
                        if (fallbackUrl) chrome.runtime.sendMessage({ action: 'openTab', url: fallbackUrl });
                        popup.close();
                    }
                }, 300); 
            }
        });

        const shareBtn = createBtn(icons.share, chrome.i18n.getMessage("btnShare") || "Share", function() {
            const currentUrl = isTabbedMode ? popup.tabs.find(t => t.id === popup.activeTabId)?.url : popup.urlInput.value;
            if (!currentUrl) return;
            if (navigator.share) navigator.share({ title: 'Shared from MiniTab', url: currentUrl }).catch(e => console.log(e));
            else navigator.clipboard.writeText(currentUrl).then(() => { 
                const orig = this.innerHTML; 
                const copiedText = chrome.i18n.getMessage("copied") || "COPIED";
                this.innerHTML = `<span style="font-size:8px; font-weight:bold; color:var(--mt-accent);">${copiedText}</span>`; 
                setTimeout(() => this.innerHTML = orig, 1500); 
            });
        }, false); 

        const fullBtn = createBtn(icons.fullscreen, chrome.i18n.getMessage("btnFullscreen") || "Fullscreen", () => {
            popup.savedState = { width: popup.container.style.width, height: popup.container.style.height, top: popup.container.style.top, left: popup.container.style.left };
            popup.container.style.cssText += `top: 0; left: 0; width: 100vw; height: 100vh; gap: 0; border-radius: 0;`;
            sidebar.style.display = 'none'; popup.headerEl.style.borderRadius = '0';
        });

        const halfBtn = createBtn(icons.halfscreen, chrome.i18n.getMessage("btnHalfscreen") || "Halfscreen", () => { 
            popup.savedState = { width: popup.container.style.width, height: popup.container.style.height, top: popup.container.style.top, left: popup.container.style.left };
            const rect = popup.container.getBoundingClientRect(); const popupCenterX = rect.left + (rect.width / 2); const screenCenterX = window.innerWidth / 2;
            popup.container.style.height = '96vh'; popup.container.style.width = 'calc(50vw - 15px)'; popup.container.style.top = '2vh'; popup.container.style.borderRadius = '10px';
            popup.container.style.left = popupCenterX < screenCenterX ? '10px' : 'calc(50vw + 5px)';
        });

        const zoomInBtn = createBtn(icons.zoomIn, chrome.i18n.getMessage("btnZoomIn") || "Zoom In", () => adjustZoom(0.1));
        const zoomOutBtn = createBtn(icons.zoomOut, chrome.i18n.getMessage("btnZoomOut") || "Zoom Out", () => adjustZoom(-0.1));
        
        const settingsBtn = createBtn(icons.settings, chrome.i18n.getMessage("btnSettings") || "Settings", () => { chrome.runtime.sendMessage({ action: 'openOptions' }); }); 
        settingsBtn.style.marginTop = "auto";
        
        const closeBtn = createBtn(icons.close, chrome.i18n.getMessage("btnClose") || "Close", () => popup.close()); 

        sidebar.append(pinBtn, bookmarkBtn, screenshotBtn, muteBtn, openNewTabBtn, shareBtn, zoomInBtn, zoomOutBtn, halfBtn, fullBtn, settingsBtn, closeBtn);

        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `flex-grow: 1; display: flex; flex-direction: column; background-color: var(--mt-bg); border: 2px solid var(--mt-accent); border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); overflow: hidden; position: relative;`;

        const closeProgress = document.createElement('div');
        closeProgress.className = 'minitab-auto-close-bar';
        contentWrapper.appendChild(closeProgress);

        let closeTimer = null;
        popup.container.addEventListener('mouseleave', () => {
            if (prefs.closeMouseLeave && !popup.isPinned) {
                closeProgress.style.transition = 'none'; closeProgress.style.width = '100%'; closeProgress.style.opacity = '1';
                void closeProgress.offsetWidth; 
                closeProgress.style.transition = 'width 3s linear'; closeProgress.style.width = '0%';
                closeTimer = setTimeout(() => popup.close(), 3000);
            }
        });
        popup.container.addEventListener('mouseenter', () => {
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; closeProgress.style.transition = 'none'; closeProgress.style.width = '100%'; closeProgress.style.opacity = '0'; }
        });

        popup.headerEl = document.createElement('div');
        popup.headerEl.style.cssText = `min-height: 40px; background-color: var(--mt-panel); border-bottom: 1px solid var(--mt-border); display: flex; cursor: grab; user-select: none; flex-shrink: 0; border-radius: 8px 8px 0 0;`;

        popup.urlInput = document.createElement('input'); popup.urlInput.type = 'text'; popup.urlInput.spellcheck = false;
        popup.urlInput.className = 'minitab-input';
        popup.urlInput.style.cssText = `padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-align: center;`;
        popup.urlInput.addEventListener('focus', () => popup.urlInput.select());
        popup.urlInput.addEventListener('mousedown', (e) => e.stopPropagation());
        popup.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                let val = popup.urlInput.value.trim(); if (!val) return;
                let newUrl = val; const isUrlPattern = /^((https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?|localhost(:\d+)?(\/.*)?)$/i;
                if (isUrlPattern.test(val)) { if (!val.startsWith('http')) newUrl = 'https://' + val; } 
                else { const engines = { google: "https://www.google.com/search?q=", yandex: "https://yandex.com/search/?text=" }; newUrl = (engines[prefs.searchEngine] || engines['google']) + encodeURIComponent(val); }
                if (isTabbedMode) popup.updateActiveTab(newUrl); else popup.updateSingleURL(newUrl);
                popup.urlInput.blur();
            }
        });

        if (isTabbedMode) {
            popup.headerEl.style.alignItems = 'flex-end'; popup.headerEl.style.padding = '0 15px 0 5px'; popup.headerEl.style.gap = '5px'; popup.headerEl.style.overflowX = 'auto'; popup.headerEl.style.scrollbarWidth = 'none';
            popup.addressBar = document.createElement('div'); popup.addressBar.style.cssText = `height: 34px; background: var(--mt-bg); border-bottom: 1px solid var(--mt-border); display: flex; align-items: center; padding: 0 10px; flex-shrink: 0;`;
            popup.urlInput.style.width = '100%'; popup.urlInput.style.textAlign = 'left'; popup.urlInput.style.borderRadius = '6px';
            popup.addressBar.appendChild(popup.urlInput);
        } else {
            popup.headerEl.style.alignItems = 'center'; popup.headerEl.style.justifyContent = 'center'; popup.urlInput.style.width = '60%';
            popup.headerEl.appendChild(popup.urlInput);
        }

        let isDragging = false, dragX = 0, dragY = 0;
        popup.headerEl.addEventListener('mousedown', (e) => {
            if (e.target.closest('.minitab-tab') || e.target === popup.urlInput) return;
            isDragging = true; popup.headerEl.style.cursor = 'grabbing';
            if(isTabbedMode) popup.tabs.forEach(t => t.iframeEl.style.pointerEvents = 'none'); else if(popup.singleIframe) popup.singleIframe.style.pointerEvents = 'none';
            const rect = popup.container.getBoundingClientRect(); dragX = e.clientX - rect.left; dragY = e.clientY - rect.top;
            const currentW = popup.container.style.width;
            if (currentW === '100vw' || currentW.includes('50vw')) {
                popup.container.style.width = popup.savedState ? popup.savedState.width : savedWindowPrefs.width; popup.container.style.height = popup.savedState ? popup.savedState.height : savedWindowPrefs.height;
                popup.container.style.top = popup.savedState ? popup.savedState.top : savedWindowPrefs.top; popup.container.style.left = popup.savedState ? popup.savedState.left : savedWindowPrefs.left;
                popup.container.style.borderRadius = '10px'; sidebar.style.display = 'flex'; popup.headerEl.style.borderRadius = '8px 8px 0 0';
            }
        });
        document.addEventListener('mousemove', (e) => { if (!isDragging) return; popup.container.style.left = `${e.clientX - dragX}px`; popup.container.style.top = `${e.clientY - dragY}px`; });
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false; popup.headerEl.style.cursor = 'grab';
                if(isTabbedMode) popup.tabs.forEach(t => t.iframeEl.style.pointerEvents = 'auto'); else if(popup.singleIframe) popup.singleIframe.style.pointerEvents = 'auto';
                const w = popup.container.style.width; if (w !== '100vw' && !w.includes('50vw')) saveWindowPrefs({ top: popup.container.style.top, left: popup.container.style.left });
            }
        });

        const resizeObs = new ResizeObserver(() => {
            const w = popup.container.style.width; const h = popup.container.style.height;
            if (w && h && w !== '100vw' && !w.includes('50vw')) saveWindowPrefs({ width: w, height: h });
        });
        resizeObs.observe(popup.container);

        popup.iframeWrapper = document.createElement('div'); popup.iframeWrapper.style.cssText = `flex-grow: 1; overflow: hidden; position: relative; background: var(--mt-bg); border-radius: 0 0 8px 8px;`;
        if (isTabbedMode) contentWrapper.append(popup.headerEl, popup.addressBar, popup.iframeWrapper); else contentWrapper.append(popup.headerEl, popup.iframeWrapper);
        popup.container.append(sidebar, contentWrapper); document.body.appendChild(popup.container);

        const adjustZoom = (delta) => {
            popup.currentZoom = Math.max(0.5, Math.min(2, popup.currentZoom + delta));
            const applyToIframe = (ifr) => { if(!ifr) return; ifr.style.transform = `scale(${popup.currentZoom})`; ifr.style.width = `${100 / popup.currentZoom}%`; ifr.style.height = `${100 / popup.currentZoom}%`; };
            if (isTabbedMode) popup.tabs.forEach(t => applyToIframe(t.iframeEl)); else applyToIframe(popup.singleIframe);
        };

        popup.addTab = (url) => {
            popup.tabCounter++; const id = 'tab_' + popup.tabCounter;
            const tabEl = document.createElement('div'); tabEl.className = 'minitab-tab';
            const titleSpan = document.createElement('span'); titleSpan.innerText = getDomain(url); titleSpan.style.cssText = `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none;`;
            const closeBtn = document.createElement('span'); closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `font-size: 10px; cursor: pointer; padding: 2px 4px; border-radius: 50%;`;
            closeBtn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); popup.removeTab(id); });
            tabEl.append(titleSpan, closeBtn); tabEl.addEventListener('mousedown', () => popup.activateTab(id));

            const iframeEl = document.createElement('iframe'); 
            iframeEl.name = 'minitab-iframe';
            iframeEl.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen; microphone; camera');
            iframeEl.setAttribute('referrerpolicy', 'no-referrer');
            iframeEl.style.cssText = `width: 100%; height: 100%; border: none; display: none; background: #fff; transform-origin: top left;`;
            
            iframeEl.addEventListener('load', () => { if (popup.isMuted) iframeEl.contentWindow.postMessage({ type: 'MINITAB_MUTE', state: true }, '*'); });

            popup.tabs.push({ id, url, tabEl, iframeEl, titleSpan });
            popup.headerEl.appendChild(tabEl); popup.iframeWrapper.appendChild(iframeEl); popup.activateTab(id);
            
            // LİNK GÜVENLİK DUVARINDAN DİNAMİK GEÇİRİLİYOR
            chrome.runtime.sendMessage({ action: 'prepareUrl', url: url }, () => {
                iframeEl.src = url;
            });
        };

        popup.activateTab = (id) => {
            popup.activeTabId = id;
            popup.tabs.forEach(t => {
                if (t.id === id) {
                    t.tabEl.className = 'minitab-tab minitab-tab-active';
                    t.iframeEl.style.display = 'block'; t.iframeEl.style.transform = `scale(${popup.currentZoom})`; t.iframeEl.style.width = `${100 / popup.currentZoom}%`; t.iframeEl.style.height = `${100 / popup.currentZoom}%`;
                    popup.urlInput.value = t.url;
                    popup.updateBookmarkIcon(t.url);
                } else { 
                    t.tabEl.className = 'minitab-tab';
                    t.iframeEl.style.display = 'none'; 
                }
            });
        };

        popup.updateActiveTab = (url) => { 
            saveToHistory(url); popup.updateBookmarkIcon(url);
            const active = popup.tabs.find(t => t.id === popup.activeTabId); 
            if (active) { 
                active.url = url; 
                active.titleSpan.innerText = getDomain(url); 
                popup.urlInput.value = url; 
                chrome.runtime.sendMessage({ action: 'prepareUrl', url: url }, () => {
                    active.iframeEl.src = url;
                });
            } 
        };
        
        popup.removeTab = (id) => {
            const idx = popup.tabs.findIndex(t => t.id === id); if (idx === -1) return;
            popup.tabs[idx].tabEl.remove(); popup.tabs[idx].iframeEl.remove(); popup.tabs.splice(idx, 1);
            if (popup.tabs.length === 0) popup.close(); else if (popup.activeTabId === id) popup.activateTab(popup.tabs[Math.max(0, idx - 1)].id);
        };

        popup.updateSingleURL = (url) => {
            saveToHistory(url); popup.updateBookmarkIcon(url);
            popup.urlInput.value = url;
            if (!popup.singleIframe) { 
                popup.singleIframe = document.createElement('iframe'); 
                popup.singleIframe.name = 'minitab-iframe';
                popup.singleIframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen; microphone; camera');
                popup.singleIframe.setAttribute('referrerpolicy', 'no-referrer');
                popup.singleIframe.style.cssText = `width: 100%; height: 100%; border: none; background: #fff; transform-origin: top left;`; 
                popup.singleIframe.addEventListener('load', () => { if (popup.isMuted) popup.singleIframe.contentWindow.postMessage({ type: 'MINITAB_MUTE', state: true }, '*'); });
                popup.iframeWrapper.appendChild(popup.singleIframe); 
            }
            chrome.runtime.sendMessage({ action: 'prepareUrl', url: url }, () => {
                popup.singleIframe.src = url;
            });
        };

        popup.close = () => { 
            if (popup.container) popup.container.remove(); 
            activePopups = activePopups.filter(p => p !== popup); 
            resizeObs.disconnect(); 
        };
        
        if (isTabbedMode) popup.addTab(initialUrl); else popup.updateSingleURL(initialUrl); 
        return popup;
    }
}

// ==========================================
// --- KULLANICI ETKİLEŞİMLERİ (Her Sayfa ve Normal İframe İçin) ---
// ==========================================
if (!isMiniTab) {

    let progressIndicator, progressDot;

    function initIndicator() {
        if (progressIndicator) return;
        progressIndicator = document.createElement('div');
        progressIndicator.className = 'minitab-progress-indicator';
        progressDot = document.createElement('div');
        progressDot.className = 'minitab-progress-dot';
        progressIndicator.appendChild(progressDot);
        
        // Güvenli DOM ekleme (iframe henüz yüklenmemişse documentElement kullanılır)
        if (document.body) document.body.appendChild(progressIndicator);
        else document.documentElement.appendChild(progressIndicator);
    }

    function startProgress(x, y, duration) {
        initIndicator();
        progressIndicator.style.left = x + 'px'; 
        progressIndicator.style.top = y + 'px'; 
        progressIndicator.style.opacity = '1'; 
        
        progressDot.style.transition = 'none'; 
        progressDot.style.transform = 'scale(0)'; 
        progressDot.style.opacity = '0.4'; 
        
        void progressIndicator.offsetWidth; 
        void progressDot.offsetWidth; 
        
        requestAnimationFrame(() => {
            progressDot.style.transition = `transform ${duration}ms linear, opacity ${duration}ms linear`; 
            progressDot.style.transform = 'scale(1)'; 
            progressDot.style.opacity = '1'; 
        });
    }
    
    function stopProgress() { 
        if (!progressIndicator) return;
        progressIndicator.style.opacity = '0'; 
        progressDot.style.transition = 'none'; 
        progressDot.style.transform = 'scale(0)'; 
        progressDot.style.opacity = '0.4'; 
    }

    function fireMiniTabAction(url) {
        if (isTop) triggerMiniTab(url);
        else window.top.postMessage({ type: 'MINITAB_OPEN', url: url }, '*');
    }

    let hoveredLink = null, longHoverHalfTimer = null, longHoverFullTimer = null;
    let clickStartX = 0, clickStartY = 0, longClickHalfTimer = null, longClickFullTimer = null, longClickFired = false;

    // CAPTURE (TRUE): İframelerin tıklamayı yutmasını engeller!
    document.addEventListener('mousemove', (e) => {
        if (longClickHalfTimer || longClickFullTimer || longHoverHalfTimer || longHoverFullTimer) {
            if (e.clientX !== clickStartX || e.clientY !== clickStartY) {
                clearTimeout(longClickHalfTimer); clearTimeout(longClickFullTimer);
                clearTimeout(longHoverHalfTimer); clearTimeout(longHoverFullTimer);
                longClickHalfTimer = null; longClickFullTimer = null; 
                longHoverHalfTimer = null; longHoverFullTimer = null;
                longClickFired = false; 
                stopProgress();
            }
        }
    }, true);

    document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a');
        if (link && link.href) {
            hoveredLink = link;
            if (prefs.triggerLongHover) {
                clickStartX = e.clientX; clickStartY = e.clientY;
                const duration = prefs.longClickTime;
                const delayTime = duration / 3;
                const fillTime = duration - delayTime;
                
                longHoverHalfTimer = setTimeout(() => { startProgress(clickStartX, clickStartY, fillTime); }, delayTime);
                longHoverFullTimer = setTimeout(() => { stopProgress(); fireMiniTabAction(link.href); }, duration);
            }
        }
    }, true);

    document.addEventListener('mouseout', (e) => {
        const link = e.target.closest('a');
        if (link && link === hoveredLink) { 
            hoveredLink = null; 
            clearTimeout(longHoverHalfTimer); clearTimeout(longHoverFullTimer); 
            longHoverHalfTimer = null; longHoverFullTimer = null; 
            stopProgress(); 
        }
    }, true);

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && prefs.triggerHoverSpace && hoveredLink && hoveredLink.href) { e.preventDefault(); fireMiniTabAction(hoveredLink.href); }
    }, true);

    document.addEventListener('dragstart', (e) => {
        if (prefs.triggerDragLink) {
            const link = e.target.closest('a');
            if (link && link.href) { e.preventDefault(); fireMiniTabAction(link.href); }
        }
    }, true);

    document.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; 
        const link = e.target.closest('a');
        if (link && link.href) {
            if (prefs.triggerLongClick) {
                longClickFired = false; clickStartX = e.clientX; clickStartY = e.clientY;
                const duration = prefs.longClickTime;
                const delayTime = duration / 3;
                const fillTime = duration - delayTime;
                
                longClickHalfTimer = setTimeout(() => { startProgress(clickStartX, clickStartY, fillTime); }, delayTime);
                longClickFullTimer = setTimeout(() => { longClickFired = true; stopProgress(); fireMiniTabAction(link.href); longClickHalfTimer = null; longClickFullTimer = null; }, duration);
            }
        }
    }, true);

    document.addEventListener('mouseup', () => { 
        clearTimeout(longClickHalfTimer); clearTimeout(longClickFullTimer); 
        longClickHalfTimer = null; longClickFullTimer = null; 
        stopProgress(); 
    }, true);

    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (longClickFired) { e.preventDefault(); e.stopPropagation(); longClickFired = false; return; }
        if (link && link.href) {
            let activated = false;
            if (prefs.triggerAltClick && e.altKey) activated = true;
            if (prefs.triggerCtrlShiftClick && (e.ctrlKey || e.metaKey) && e.shiftKey) activated = true;
            if (activated) { e.preventDefault(); e.stopPropagation(); fireMiniTabAction(link.href); }
        }
    }, true);

    document.addEventListener('mousedown', (e) => {
        if (!prefs.closeOutside) return;
        if (isTop) {
            for (let i = activePopups.length - 1; i >= 0; i--) { const p = activePopups[i]; if (!p.isPinned && !p.container.contains(e.target)) p.close(); }
        } else {
            window.top.postMessage({ type: 'MINITAB_CLOSE_OUTSIDE' }, '*');
        }
    }, true);

    document.addEventListener('wheel', (e) => {
        if (!prefs.closeScroll) return;
        if (isTop) {
            const isInsidePopup = activePopups.some(p => p.container.contains(e.target));
            if (!isInsidePopup) activePopups.forEach(p => { if (!p.isPinned) p.close(); });
        } else {
            window.top.postMessage({ type: 'MINITAB_CLOSE_SCROLL' }, '*');
        }
    }, { capture: true, passive: true });
}