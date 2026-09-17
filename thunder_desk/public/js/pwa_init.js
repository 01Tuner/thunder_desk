/**
 * Thunder Desk - Progressive Web App Client Controller
 * Handles Service Worker registration, install prompts, standalone mode detection,
 * and update notifications.
 */

(function () {
    'use strict';

    if (window.__THUNDER_DESK_PWA_INITIALIZED__) {
        return;
    }
    window.__THUNDER_DESK_PWA_INITIALIZED__ = true;

    // 1. Ensure PWA Head Tags (Manifest, Theme Color, Apple Icons)
    function ensurePwaHeadTags() {
        const head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return;

        // Manifest
        if (!document.querySelector('link[rel="manifest"]')) {
            const manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = '/manifest.json';
            head.appendChild(manifestLink);
        }

        // Theme Color
        if (!document.querySelector('meta[name="theme-color"]')) {
            const themeColor = document.createElement('meta');
            themeColor.name = 'theme-color';
            themeColor.content = '#2563eb';
            head.appendChild(themeColor);
        }

        // Apple Mobile Web App Capable
        if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
            const appleCapable = document.createElement('meta');
            appleCapable.name = 'apple-mobile-web-app-capable';
            appleCapable.content = 'yes';
            head.appendChild(appleCapable);
        }

        // Apple Status Bar Style
        if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
            const appleStatus = document.createElement('meta');
            appleStatus.name = 'apple-mobile-web-app-status-bar-style';
            appleStatus.content = 'default';
            head.appendChild(appleStatus);
        }

        // Apple Touch Icon
        if (!document.querySelector('link[rel="apple-touch-icon"]')) {
            const appleIcon = document.createElement('link');
            appleIcon.rel = 'apple-touch-icon';
            appleIcon.href = '/assets/thunder_desk/images/icons/icon-180x180.png';
            head.appendChild(appleIcon);
        }
    }

    ensurePwaHeadTags();

    // 2. Standalone Mode Detection
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true ||
                         document.referrer.includes('android-app://');

    if (isStandalone) {
        document.documentElement.classList.add('is-pwa-standalone');
        if (document.body) {
            document.body.classList.add('is-pwa-standalone');
        } else {
            window.addEventListener('DOMContentLoaded', () => {
                document.body.classList.add('is-pwa-standalone');
            });
        }
    }

    // 3. Service Worker Registration
    let swRegistration = null;

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Register root /sw.js with scope /
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then((registration) => {
                    swRegistration = registration;
                    // Check for updates
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (!installingWorker) return;

                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    // New content available
                                    showUpdateToast(registration);
                                }
                            }
                        };
                    };
                })
                .catch((error) => {
                    console.warn('[PWA] Service Worker registration failed on /sw.js, trying assets fallback:', error);
                    navigator.serviceWorker.register('/assets/thunder_desk/sw.js')
                        .catch((fallbackErr) => {
                            console.error('[PWA] Service worker fallback registration also failed:', fallbackErr);
                        });
                });
        });
    }

    // 4. Update Toast Prompt
    function showUpdateToast(registration) {
        if (document.getElementById('td-pwa-update-toast')) return;

        const toast = document.createElement('div');
        toast.id = 'td-pwa-update-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e293b;
            color: #ffffff;
            border: 1px solid rgba(56, 189, 248, 0.4);
            border-radius: 12px;
            padding: 14px 20px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.2);
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            animation: tdSlideIn 0.3s ease-out;
        `;

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#38bdf8">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>New Thunder Desk update ready!</span>
            </div>
            <button id="td-pwa-refresh-btn" style="
                background: #2563eb;
                color: #ffffff;
                border: none;
                padding: 6px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
            ">Update</button>
            <button id="td-pwa-dismiss-btn" style="
                background: transparent;
                color: #94a3b8;
                border: none;
                cursor: pointer;
                font-size: 16px;
                padding: 0 4px;
            ">&times;</button>
        `;

        document.body.appendChild(toast);

        document.getElementById('td-pwa-refresh-btn').onclick = () => {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            window.location.reload();
        };

        document.getElementById('td-pwa-dismiss-btn').onclick = () => {
            toast.remove();
        };
    }

    // 5. Install Prompt Controller
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        deferredPrompt = e;

        // Dispatch custom event for custom UI integrations
        window.dispatchEvent(new CustomEvent('thunder_desk_pwa_installable', {
            detail: { prompt: deferredPrompt }
        }));

        // Automatically reveal any install buttons present on page
        const installBtns = document.querySelectorAll('.pwa-install-btn, #pwa-install-btn');
        installBtns.forEach((btn) => {
            btn.style.display = 'inline-flex';
            btn.onclick = (evt) => {
                evt.preventDefault();
                promptInstall();
            };
        });
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        console.log('[PWA] Thunder Desk was successfully installed.');
        const installBtns = document.querySelectorAll('.pwa-install-btn, #pwa-install-btn');
        installBtns.forEach((btn) => {
            btn.style.display = 'none';
        });
    });

    function promptInstall() {
        if (!deferredPrompt) {
            if (isStandalone) {
                alert('Thunder Desk is already installed and running as an app.');
            } else {
                alert('To install Thunder Desk, use your browser menu (Install app / Add to Home screen).');
            }
            return;
        }

        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted the install prompt');
            } else {
                console.log('[PWA] User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }

    // Expose Thunder Desk PWA API globally
    window.ThunderDeskPWA = {
        promptInstall: promptInstall,
        isStandalone: isStandalone,
        getRegistration: () => swRegistration
    };
})();
