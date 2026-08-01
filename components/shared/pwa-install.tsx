"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }

    if (isStandalone() || window.localStorage.getItem("nexora-install-dismissed") === "1") {
      return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) {
      setShowIosHelp(true);
      setVisible(true);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem("nexora-install-dismissed", "1");
    setVisible(false);
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setInstallPrompt(null);
  }

  if (!visible) return null;

  return (
    <aside className="pwa-install" aria-label="安装 NEXORA 应用">
      <div className="pwa-install-icon" aria-hidden="true">N</div>
      <div className="pwa-install-copy">
        <strong>安装 NEXORA APP</strong>
        {showIosHelp && !installPrompt ? (
          <span><Share size={14} /> 点击浏览器“分享”，再选择“添加到主屏幕”</span>
        ) : (
          <span>添加到主屏幕，像普通 APP 一样快速打开</span>
        )}
      </div>
      {installPrompt ? (
        <button className="pwa-install-button" type="button" onClick={install}>
          <Download size={16} /> 安装
        </button>
      ) : null}
      <button className="pwa-install-close" type="button" onClick={dismiss} aria-label="暂不安装">
        <X size={16} />
      </button>
    </aside>
  );
}
