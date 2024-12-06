browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const parts = message.split(':');
    const msg = parts[0];
    switch (msg) {
        case "login-available":
            console.log(parts[1]);
            browser.notifications.create("autofill-notif" /* notification id */, {
                type: "basic",
                title: "Anmeldedaten für diese Seite verfügbar",
                message: "Öffnen Sie das Passwortmanager-Plugin, um die Anmeldedaten zu erhalten."
            });
            browser.browserAction.setPopup({
                popup: `http://localhost:3000/getlogindata/${parts[1]}`
            });
            break;

        case "login-unavailable":
            browser.browserAction.setPopup({
                popup: "http://localhost:3000/pluginloggedinview"
            });
            break;
    }
});