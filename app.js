const express = require('express');
const app = express();
const path = require('path');
const ejs = require('ejs');

// app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/userlist', (req, res) => {
    const users = [
        { id: 1, username: 'MWE', name: 'Marcel Weber', Abteilung: 'IT, Entwicklung' },
        { id: 2, username: 'JKO', name: 'Justin Konrad', Abteilung: 'Entwicklung' },
        { id: 2, username: 'JGO', name: 'Jonas Goldschmitd', Abteilung: 'Entwicklung' },
        { id: 2, username: 'KAT', name: 'Khadija Alipour', Abteilung: 'Support' },
        // Add more users as needed
    ];
    res.render('userlist', { users: users });
});


app.get('/passwords', (req, res) => {
    const passwords = [
        { webSite: 'example.com', email: 'user@example.com', username: 'user1', password: 'password1' },
        { webSite: 'example.org', email: 'user2@example.org', username: 'user2', password: 'password2' }
        // Weitere Passwörter hier hinzufügen
    ];
    res.render('passwordView', { password: passwords });
});

app.listen(3000);