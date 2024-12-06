window.addEventListener("load", (window, event) => {
    browser.runtime.sendMessage("check-login");
});