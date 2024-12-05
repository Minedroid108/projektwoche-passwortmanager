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
    // window.location.hostname
    fetch('http://localhost:3000/checkForWebsite', {
        method: 'post',
        body: JSON.stringify({
            site: window.location.hostname
        }),
        headers: {
            "Content-Type": "application/json; charset=UTF-8"
        }
    }).then((res) => {
        if (res.status == 200) {
            browser.runtime.sendMessage("notify-login-available");
            browser.browserAction.setPopup({
                popup: "./popup_data_available.html"
            });
        }
    });
}

window.addEventListener("load", checkForLogin);