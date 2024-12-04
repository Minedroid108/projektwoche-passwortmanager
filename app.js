const express = require('express');
const app = express();
const path = require('path');
const ejs = require('ejs');
const mysql = require('mysql2');
const { error } = require('console');

// app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static('public'));

// SQL Database connection
const connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'root',
  password : 'manager',
  database : 'passwortmanager'
});

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/companySettings', (req, res) => {
    res.render('companySettings');
})

app.get('/userlist', async (req, res) => {
    // get Users
    const queryUsers = 'SELECT * FROM usertable;'
    const valuesUsers = ''
    const users = await executeSQL(queryUsers, valuesUsers)
    console.log(users)

    // get Abteilungen
    const queryAbteilungen = 'SELECT * FROM abteilung;'
    const valuesAbteilungen = ''
    const abteilungen = await executeSQL(queryAbteilungen, valuesAbteilungen)
    console.log(abteilungen)

    res.render('userlist', { users: users, abteilungen: abteilungen});
});

app.get('/addUser', (req, res) => {
    res.render('addUser');
});

app.post('/addUser', (req, res) => {
    const newUser = {
        username: req.body.username,
        name: req.body.name,
        Abteilung: req.body.Abteilung
    };
    users.push(newUser);
    res.redirect('/userlist');
});

app.get('/passwords', (req, res) => {
    const passwords = [
        { webSite: 'example.com', email: 'user@example.com', username: 'user1', password: 'password1' },
        { webSite: 'example.org', email: 'user2@example.org', username: 'user2', password: 'password2' }
        // Weitere Passwörter hier hinzufügen
    ];
    res.render('passwordView', { password: passwords });
});

let deparmentLists = [
    { deparmentList: 'IT', quantityOfUser: 10, users: [{ username: 'user1', fullName: 'User One' }, { username: 'user2', fullName: 'User Two' }] },
    { deparmentList: 'HR', quantityOfUser: 5, users: [{ username: 'user3', fullName: 'User Three' }, { username: 'user4', fullName: 'User Four' }] }
    // Weitere Abteilungen hinzufügen
];

app.get('/deparmentList', (req, res) => {
    res.render('deparmentList', { deparmentLists: deparmentLists });
});

app.post('/addDepartment', (req, res) => {
    const newDepartment = {
        deparmentList: req.body.deparmentName,
        quantityOfUser: 0, // Standardwert für neue Abteilungen
        users: []
    };
    deparmentLists.push(newDepartment);
    res.redirect('/deparmentList');
});

app.get('/editDepartment/:deparmentList', (req, res) => {
    const department = deparmentLists.find(d => d.deparmentList === req.params.deparmentList);
    if (department) {
        res.render('editDepartment', { department: department });
    } else {
        res.status(404).send('Abteilung nicht gefunden');
    }
});

app.delete('/removeUser/:deparmentList/:username', (req, res) => {
    const department = deparmentLists.find(d => d.deparmentList === req.params.deparmentList);
    if (department) {
        department.users = department.users.filter(user => user.username !== req.params.username);
        department.quantityOfUser = department.users.length;
        res.sendStatus(200);
    } else {
        res.status(404).send('Abteilung oder Benutzer nicht gefunden');
    }
});

const passwords = [
    { webSite: 'example.com', email: 'user@example.com', username: 'user1', password: 'password1' },
    // Weitere Passwörter hier hinzufügen
];

app.get('/editPasswords', (req, res) => {
    res.render('editPasswords', { password: passwords });
});

app.post('/updatePassword', (req, res) => {
    // Hier können Sie die Logik zum Aktualisieren des Passworts hinzufügen
    console.log(req.body);
    res.redirect('/editPasswords');
});

app.get('/accountView', (req, res) => {
    const user = {
        vorname: 'User',
        nachname: 'One',
        password: 'password1',
        masterPassword: 'master1',
        department: 'IT'
    };
    res.render('accountView', { user: user });
});

function executeSQL(query, values) {
    return new Promise((resolve, reject) => {
        connection.query(query, values, (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                return resolve(result);
            }
        })
    })
}

app.listen(3000);