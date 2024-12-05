browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message) {
        case "login-available":
            browser.notifications.create("autofill-notif", {
                type: "basic",
                title: "Anmeldedaten für diese Seite verfügbar",
                message: "Öffnen Sie das Passwortmanager-Plugin, um die Anmeldedaten zu erhalten."
            });
            browser.browserAction.setPopup({
                popup: "./popup_data_available.html"
            });
            break;

        case "login-unavailable":
            browser.browserAction.setPopup({
                popup: "http://localhost:3000"
            });
            break;
    }
});