// Dashboard Button
const dashboardButton = document.getElementById("dashboard-button");
function openDashboardPage() {
    browser.tabs.create({
        url: "DASHBOARD LINK HIER EINFÜGEN !!!"
    });
}
dashboardButton.addEventListener("click", openDashboardPage);

// Nutzerinformationen
const fullNameLabel = document.getElementById("full-name");
const usernameLabel = document.getElementById("username");

function onGot(item) {
    if (item.fullName) {
        fullNameLabel.textContent = item.fullName;
    }
    if (item.username) {
        usernameLabel.textContent = item.username;
    }
}

function onError(error) {
    console.log(`Error: ${error}`);
}

browser.storage.sync.get("username").then(onGot, onError);
browser.storage.sync.get("fullName").then(onGot, onError);