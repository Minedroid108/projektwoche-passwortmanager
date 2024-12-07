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

async function checkForLogin(tabId) {
    // Nach Formularfeldern zur Anmeldung suchen
    browser.tabs.executeScript(tabId, {
        code: `
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
            if (loginInputs.length > 0) {
                browser.runtime.sendMessage("login-form-found:".concat(window.location.hostname));
            }
        `
    });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var parts = message.split(':');
    var msg = parts[0];
    switch (msg) {
        case "login-form-found":
            // Prüfen, ob Anmeldedaten für die aktuelle Seite gespeichert sind
            const site = parts[1];
            fetch("http://localhost:3000/checkForWebsite", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    site: site
                })
            }).then((res) => {
                if (res.status == 200) {
                    browser.notifications.create("autofill-notif" /* <- notification id */, {
                        type: "basic",
                        title: "Anmeldedaten für diese Seite verfügbar",
                        message: "Öffnen Sie das Passwortmanager-Plugin, um die Anmeldedaten zu erhalten."
                    });
                    browser.browserAction.setPopup({
                        popup: `http://localhost:3000/getlogindata/${site}`
                    });
                } else {
                    browser.browserAction.setPopup({
                        popup: "http://localhost:3000/pluginloggedinview"
                    });
                }
            });
            break;
    }
});
browser.tabs.onActivated.addListener((activeInfo) => {
    if (activeInfo.tabId === activeInfo.previousTabId) {
        return;
    }
    checkForLogin(activeInfo.tabId);
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        checkForLogin(tabId);
    }
});