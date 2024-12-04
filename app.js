const express = require('express');
const app = express();
const path = require('path');
const ejs = require('ejs');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { error } = require('console');
const { title } = require('process');
const bodyParser = require('body-parser');

// const secret = 'abcd';
// const hash = createHmac('sha256', secret).update('test').digest('hex');
// console.log(hash);
// const tmp = crypto.getHashes();
// console.log(tmp)

// app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(bodyParser.urlencoded({limit: '5000mb', extended: true, parameterLimit: 100000000000}));

// SQL Database connection
const connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'root',
  password : 'lucario52755',
  database : 'passwortmanager'
});

app.get('/', (req, res) => {
    res.render('login', {
        title: 'Login'
    });
})

// user
app.get('/addUser', function(req, res) {
    res.render('addUser', {
        title: 'Nutzer anlegen'
    })
})

app.post('/addUser', function(req, res) {
    // get passwords
    const loginPasswort = req.body.loginPasswort;
    const masterPasswort = req.body.masterPasswort;

    // generate salt
    const saltRounds = 10;
    bcrypt.genSalt(saltRounds, function(error, salt) {
        if (error) throw error;

        // generate login password hash
        bcrypt.hash(loginPasswort, salt, function(error, loginPasswortHash) {
            if (error) throw error;

            // generate master password hash
            bcrypt.hash(masterPasswort, salt, async function(error, masterPasswortHash) {
                if (error) throw error;

                // get date
                const date = new Date()
                const dateFormat = formatDate(date);

                // const userdata = {
                //     vorname: req.body.vorname,
                //     nachname: req.body.nachname,
                //     nutzername: req.body.nutzername,
                //     isAdmin: req.body.isAdmin,
                //     passwordSalt: salt,
                //     loginPasswort: loginPasswortHash,
                //     masterPasswort: masterPasswortHash,
                //     createDate: dateFormat,
                //     updateDate: dateFormat
                // }
                // console.log(userdata);

                const query = "INSERT INTO `passwortmanager`.`user` (`Vorname`, `Nachname`, `Nutzername`, `IsAdmin`, `PasswortSalt`, `LoginPasswort`, `MasterPasswort`, `CreateDate`, `UpdateDate`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"
                const values = [
                    req.body.vorname,
                    req.body.nachname,
                    req.body.nutzername,
                    req.body.isAdmin,
                    salt,
                    loginPasswortHash,
                    masterPasswortHash,
                    dateFormat,
                    dateFormat
                ]
                executeSQL(query, values);
                console.log('user "' + req.body.nutzername + '" created');
            })
        })
    })
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

    res.render('userlist', { 
        title: 'Nutzerliste',
        users: users, 
        abteilungen: abteilungen});
});

// userdata
app.get('/passwords', (req, res) => {
    const passwords = [
        { webSite: 'example.com', email: 'user@example.com', username: 'user1', password: 'password1' },
        { webSite: 'example.org', email: 'user2@example.org', username: 'user2', password: 'password2' }
        // Weitere Passwörter hier hinzufügen
    ];
    res.render('passwordView', { password: passwords });
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

function formatDate(date) {
    let datePart = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    ].map((n, i) => n.toString().padStart(i === 0 ? 4 : 2, "0")).join("-");
    let timePart = [
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    ].map((n, i) => n.toString().padStart(2, "0")).join(":");
    return datePart + " " + timePart;
}

app.listen(3000);