const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ limit: '5000mb', extended: true, parameterLimit: 100000000000 }));

// Session configuration
app.use(session({
  secret: 'your-secret-key', // Ändern Sie dies in einen sicheren Schlüssel
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Setzen Sie secure auf true, wenn Sie HTTPS verwenden
}));

// SQL Database connection
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'manager',
  database: 'passwortmanager'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database');
});

// Login Page
app.get('/', (req, res) => {
  res.render('login', {
    title: 'Login'
  });
});

app.post('/passwordView', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM user WHERE Nutzername = ?';
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Error executing query:', err.stack);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length === 0) {
      res.send('Benutzer existiert nicht');
      return;
    }

    const user = results[0];
    bcrypt.compare(password, user.LoginPasswort, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err.stack);
        res.status(500).send('Internal Server Error');
        return;
      }

      if (isMatch) {
        req.session.user = user.ID; // Speichern Sie Benutzerdaten in der Session
        res.redirect('/companySettings'); // oder eine andere Seite nach dem Login
      } else {
        res.send('Falsches Passwort');
      }
    });
  });
});

// Middleware zum Überprüfen, ob der Benutzer eingeloggt ist
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    console.log(req.session.user);
    return next();
  } else {
    res.redirect('/');
  }
}

// Beispiel einer geschützten Route
app.get('/companySettings', isAuthenticated, (req, res) => {
  res.render('companySettings');
});

// User
app.get('/addUser', function (req, res) {
  res.render('addUser', {
    title: 'Nutzer anlegen'
  });
});

app.post('/addUser', function (req, res) {
  // to do: check if user already exists 

  // get passwords
  const loginPasswort = req.body.loginPasswort;
  const masterPasswort = req.body.masterPasswort;

  // generate salt
  const saltRounds = 10;
  bcrypt.genSalt(saltRounds, function (error, salt) {
    if (error) throw error;

    // generate login password hash
    bcrypt.hash(loginPasswort, salt, function (error, loginPasswortHash) {
      if (error) throw error;

      // generate master password hash
      bcrypt.hash(masterPasswort, salt, async function (error, masterPasswortHash) {
        if (error) throw error;

        // get date
        const date = new Date();
        const dateFormat = formatDate(date);

        // Insert user into database
        const query = 'INSERT INTO user (Nutzername, LoginPasswort, MasterPasswort, Erstellungsdatum) VALUES (?, ?, ?, ?)';
        const values = [req.body.username, loginPasswortHash, masterPasswortHash, dateFormat];
        connection.query(query, values, (err, results) => {
          if (err) {
            console.error('Error inserting user:', err.stack);
            res.status(500).send('Internal Server Error');
            return;
          }
          res.redirect('/userlist');
        });
      });
    });
  });
});

app.get('/companySettings', (req, res) => {
  res.render('companySettings');
});

app.get('/userlist', async (req, res) => {
  // get Users
  const queryUsers = 'SELECT * FROM usertable;';
  const users = await executeSQL(queryUsers);

  // get Abteilungen
  const queryAbteilungen = 'SELECT * FROM abteilung;';
  const abteilungen = await executeSQL(queryAbteilungen);

  res.render('userlist', {
    title: 'Nutzerliste',
    users: users,
    abteilungen: abteilungen
  });
});

app.get('/login', function (req, res) {
  res.render('login', {
    title: 'Login'
  });
});

app.post('/login', function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  new Promise(async function (resolve, reject) {
    const queryUsername = "SELECT ID FROM user WHERE Nutzername = ?";
    const valuesUsername = [username];
    const userID = await executeSQL(queryUsername, valuesUsername);

    const queryPassword = "SELECT LoginPassword FROM user WHERE ID = ?";
    const valuesPassword = [password];
    const passwordHash = await executeSQL(queryPassword, valuesPassword);
  });
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
        resolve(result);
      }
    });
  });
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

app.listen(3000, () => {
  console.log('Server läuft auf Port 3000');
});