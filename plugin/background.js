function fillOutForm(loginInputs, email, username, password) {
    loginInputs.forEach(input => {
        switch (input.type.toLowerCase()) {
            case "email":
                input.value = email;
                return;

            case "password":
                input.value = username;
                return;
        }
        switch (input.name.toLowerCase()) {
            case "email":
                input.value = email;
                return;

            case "password":
                input.value = password;
                return;

            case "username":
                input.value = username;
                return;
        }
    });
}

function checkForLogin() {
    // Nach Formularfeldern zur Anmeldung suchen
    var loginInputs = [];
    var inputs = document.getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        switch (input.type.toLowerCase()) {
            case "email":
            case "password":
                loginInputs.push(input);
                continue;
        }
        switch (input.name.toLowerCase()) {
            case "email":
            case "username":
            case "password":
                loginInputs.push(input);
                continue;
        }
    }
    if (loginInputs.length < 1) {
        browser.runtime.sendMessage("login-unavailable");
        return;
    }

    // Prüfen, ob Anmeldedaten für die aktuelle Seite gespeichert sind
    const site = window.location.hostname;
    fetch("http://localhost:3000/checkForWebsite", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            site: site
        })
    }).then((res) => {
        console.log(res);
        if (res.status == 200) {
            browser.runtime.sendMessage(`login-available:${site}`);
        } else {
            browser.runtime.sendMessage("login-unavailable");
        }
    });
}

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

        case "check-login":
            checkForLogin();
            break;
    }
});

browser.tabs.onActivated.addListener((activeInfo) => {
    if (activeInfo.tabId === activeInfo.previousTabId) {
        return;
    }
    browser.runtime.sendMessage("check-login");
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        if (window.location.href === changeInfo.url) {
            return;
        }
    }
    browser.runtime.sendMessage("check-login");
});