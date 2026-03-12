document.addEventListener('DOMContentLoaded', () => {
    // Sayfadaki dilleri otomatik çevir
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerText = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
    });

    const keys = [
        'useTabs', 'searchEngine', 'themePref', 'accentColor',
        'triggerLongClick', 'longClickTime', 'triggerLongHover', 'triggerHoverSpace', 
        'triggerDragLink', 'triggerAltClick', 'triggerCtrlShiftClick', 
        'closeOutside', 'closeMouseLeave', 'closeScroll'
    ];

    const defaults = {
        useTabs: true, searchEngine: 'google', themePref: 'dark', accentColor: '#4da6ff',
        triggerLongClick: true, longClickTime: 500, triggerLongHover: false, triggerHoverSpace: false, 
        triggerDragLink: false, triggerAltClick: true, triggerCtrlShiftClick: false,
        closeOutside: true, closeMouseLeave: false, closeScroll: false
    };

    chrome.storage.sync.get(defaults, (data) => {
        // Renk ayarını CSS değişkeni olarak kök dizine ekle
        document.documentElement.style.setProperty('--mt-accent', data.accentColor);

        keys.forEach(key => {
            const el = document.getElementById(key);
            if (el.type === 'checkbox') el.checked = data[key];
            else el.value = data[key];
        });
    });

    keys.forEach(key => {
        const el = document.getElementById(key);
        el.addEventListener('change', () => {
            let val = el.type === 'checkbox' ? el.checked : el.value;
            if (el.type === 'number') val = parseInt(val) || 500;
            
            // Renk değiştiğinde sayfayı anında güncelle
            if (key === 'accentColor') {
                document.documentElement.style.setProperty('--mt-accent', val);
            }
            
            chrome.storage.sync.set({ [key]: val });
        });
    });
});