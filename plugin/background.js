browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message){
        case "notify-login-available":
            browser.notifications.create("autofill-notif", {
                type: "basic",
                title: "Anmeldedaten für diese Seite verfügbar",
                message: "Öffnen Sie das Passwortmanager-Plugin, um die Anmeldedaten zu erhalten."
            });
    }
});