const nameInput = document.getElementById("username");
const pwInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-button");
const loginForm = document.getElementById("login-form");

function updateButton() {
    submitBtn.disabled = !nameInput.value || !pwInput.value;
}

function checkLogin(e) {
    e.preventDefault();
    browser.storage.sync.set({
        fullName: "Beispielname",
        username: nameInput.value
    });
    browser.browserAction.setPopup({
        popup: "./popup_logged_in.html"
    });
    window.close();
}

nameInput.addEventListener("input", updateButton);
pwInput.addEventListener("input", updateButton);
loginForm.addEventListener("submit", checkLogin);