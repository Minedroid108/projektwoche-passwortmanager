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
  password : 'lucario52755',
  database : 'passwortmanager'
});

app.get('/', (req, res) => {
    res.render('index');
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