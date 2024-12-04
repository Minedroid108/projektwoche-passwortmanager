function fillOutForm(loginInputs) {
    loginInputs.forEach(input => {
        switch (input.type.toLowerCase()) {
            case "email":
                input.value = "EMAIL";
                return;

            case "password":
                input.value = "password";
                return;
        }
        switch (input.name.toLowerCase()) {
            case "email":
                input.value = "EMAIL";
                return;

            case "password":
                input.value = "password";
                return;

            case "username":
                input.value = "Username";
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
                elementCounts = true;
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
        return;
    }

    // Prüfen, ob Anmeldedaten für die aktuelle Seite gespeichert sind
    var loginAvailable = true;
    var loggedIn = true;
    if (!loggedIn) {
        browser.browserAction.setPopup({
            popup: "./popup_login.html"
        });
    } else if (loginAvailable) {
        browser.runtime.sendMessage("notify-login-available");
        browser.browserAction.setPopup({
            popup: "./popup_data_available.html"
        });
    } else {
        browser.browserAction.setPopup({
            popup: "./popup_logged_in.html"
        });
    }
}

window.addEventListener("load", checkForLogin);