const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ limit: '5000mb', extended: true, parameterLimit: 100000000000 }));

// Schlüssel und Initialisierungsvektor (IV) für die Verschlüsselung
const algorithm = 'aes-256-cbc';
const encryptionKey = 'b1b2b3b4b5b6b7b8b9b10b11b12b13b1';
const iv = crypto.randomBytes(16); // 16 Bytes für AES

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

//Error handling
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database');
});

//#region Login

app.get('/', function (req, res) {
  if (req.session.user) {
    res.redirect('companySettings');
  } else {
    res.render('login', {
      title: 'Login'
    });
  }
});

app.post('/login', async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const fromPlugin = req.body.fromPlugin;

  try {
    const queryUsername = "SELECT ID, LoginPasswort, Vorname, Nachname, Nutzername, IsAdmin FROM user WHERE Nutzername = ?";
    const valuesUsername = [username];
    const results = await executeSQL(queryUsername, valuesUsername);

    if (results.length === 0) {
      return res.send('Benutzer existiert nicht');
    }

    const user = results[0];
    console.log(user)
    const passwordHash = user.LoginPasswort;

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (isMatch) {
      req.session.user = user.ID; // Speichern Sie Benutzerdaten in der Session
      req.session.username = user.Nutzername;
      req.session.fullName = `${user.Vorname} ${user.Nachname}`;
      req.session.isAdmin = user.IsAdmin;
      if (fromPlugin) {
        res.redirect('/pluginLoggedInView');
      } else {
        console.log('Login erfolgreich, Benutzer-ID:', user.ID);
        res.redirect('/passwords'); // Weiterleitung zur passwordView-Seite
      }
    } else {
      res.send('Falsches Passwort');
    }
  } catch (error) {
    console.error('Error during login:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

//#endregion

//#region Plugin
app.get('/pluginlogin', (req, res) => {
  if (req.session.user) {
    res.redirect('pluginLoggedInView');
  } else {
    res.render('pluginlogin', {
      title: 'Login'
    });
  }
});

app.get('/pluginLoggedInView', (req, res) => {
  res.render('pluginLoggedInView', {
    title: "Logged In",
    username: req.session.username,
    fullName: req.session.fullName,
    isAdmin: req.session.isAdmin
  })
});

app.post('/checkForWebsite', (req, res) => {
  if (!req.session.user) {
    res.send({
      found: false
    });
  } else {
    const { site } = req.body;

    const query = "SELECT * FROM userlogindata WHERE UserID = ? AND Site = ?";
    const values = [req.session.user, site];
    connection.query(query, values, (err, results) => {
      if (err) {
        console.log(`Error executing query: ${err}`);
        res.status(500).send('Internal Server Error');
        return;
      }

      if (results.length == 0) {
        res.status(404).send('Keine Anmeldedaten gefunden!');
        return;
      }

      results.forEach(loginData => {
        if (loginData.Seite === site) {
          res.status(200).send('Anmeldedaten vorhanden!');
        }
      });
      res.status(404).send('Keine Anmeldedaten gefunden!');
    });
  }
})
//#endregion

// Beispiel einer geschützten Route
app.get('/passwords', isAuthenticated, async (req, res) => {
  try {
    const query = 'SELECT webseite, EMail, Nutzername, Passwort FROM userlogindata';
    new Promise(async (resolve, reject) => {
      const passwords = await executeSQL(query);
      var decryptedPasswords = [];
      passwords.forEach(password => {
        password.Passwort = decrypt(password.Passwort);
        decryptedPasswords.push(password);
      })
      resolve(passwords);
    }).then((passwords) => {
      res.render('passwordView', { password: passwords });
    });
  } catch (error) {
    console.error('Error fetching passwords:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

// User
app.get('/addUser', function (req, res) {
  res.render('addUser', {
    title: 'Nutzer anlegen'
  });
});

app.post('/addUser', isAuthenticated, function (req, res) {
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
        const query = 'INSERT INTO user (Nutzername, LoginPasswort, MasterPasswort, CreateDate) VALUES (?, ?, ?, ?)';
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

app.get('/companySettings', isAuthenticated, (req, res) => {
  res.render('companySettings');
});

app.get('/userlist', isAuthenticated, async (req, res) => {
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

let deparmentLists = [
  { deparmentList: 'IT', quantityOfUser: 10, users: [{ username: 'user1', fullName: 'User One' }, { username: 'user2', fullName: 'User Two' }] },
  { deparmentList: 'HR', quantityOfUser: 5, users: [{ username: 'user3', fullName: 'User Three' }, { username: 'user4', fullName: 'User Four' }] }
  // Weitere Abteilungen hinzufügen
];

app.get('/deparmentList', isAuthenticated, (req, res) => {
  res.render('deparmentList', { deparmentLists: deparmentLists });
});

app.post('/addDepartment', isAuthenticated, (req, res) => {
  const newDepartment = {
    deparmentList: req.body.deparmentName,
    quantityOfUser: 0, // Standardwert für neue Abteilungen
    users: []
  };
  deparmentLists.push(newDepartment);
  res.redirect('/deparmentList');
});

app.get('/editDepartment/:deparmentList', isAuthenticated, (req, res) => {
  const department = deparmentLists.find(d => d.deparmentList === req.params.deparmentList);
  if (department) {
    res.render('editDepartment', { department: department });
  } else {
    res.status(404).send('Abteilung nicht gefunden');
  }
});

app.delete('/removeUser/:deparmentList/:username', isAuthenticated, (req, res) => {
  const department = deparmentLists.find(d => d.deparmentList === req.params.deparmentList);
  if (department) {
    department.users = department.users.filter(user => user.username !== req.params.username);
    department.quantityOfUser = department.users.length;
    res.sendStatus(200);
  } else {
    res.status(404).send('Abteilung oder Benutzer nicht gefunden');
  }
});

app.get('/editPasswords', isAuthenticated, (req, res) => {
  const { index, webseite, EMail, Nutzername, Passwort } = req.query;
  const password = [{
    webSite: webseite,
    email: EMail,
    username: Nutzername,
    password: Passwort
  }];
  const title = 'Gespeichertes Passwort bearbeiten';
  res.render('editPasswords', {
    password,
    title,
    targetLink: '/editPassword'
  });
});

app.get('/createPassword', isAuthenticated, async (req, res) => {
  const { index, webseite, EMail, Nutzername, Passwort } = req.query;
  const title = 'Neues Passwort erstellen';
  const password = [{
    webSite: webseite,
    email: EMail,
    username: Nutzername,
    password: Passwort
  }];
  res.render('editPasswords', {
    password,
    title,
    targetLink: '/createPassword',
    userID: req.session.user
  });
});

app.post('/createPassword', isAuthenticated, async (req, res) => {
  const webSite = req.body.webSite;
  const email = req.body.email;
  const userID = req.body.userID;
  const username = req.body.username;
  const password = req.body.newPassword;
  const date = new Date();
  const dateFormat = formatDate(date);

  // Verschlüssele das neue Passwort
  const encryptedPassword = encrypt(password);

  const query = 'INSERT INTO userlogindata (webseite, userID, EMail, Nutzername, Passwort, CreateDate, UpdateDate) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const values = [webSite, userID, email, username, encryptedPassword, dateFormat, dateFormat];


  connection.query(query, values, (err, results) => {
    if (err) {
      console.error('Error inserting user:', err.stack);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.redirect('/passwords');
  });
});

app.post('/updatePassword', isAuthenticated, async (req, res) => {
  const { webSite, email, username, newPassword } = req.body;

  try {
    // Überprüfe, ob das alte Passwort korrekt ist
    const query = 'SELECT Passwort FROM userlogindata WHERE webseite = ? AND EMail = ? AND Nutzername = ?';
    const values = [webSite, email, username];
    const [results] = await connection.promise().query(query, values);

    if (results.length === 0) {
      return res.status(404).send('Eintrag nicht gefunden.');
    }

    // Verschlüssele das neue Passwort
    const encryptedPassword = encrypt(newPassword);

    // Update das Passwort in der Datenbank
    const updateQuery = 'UPDATE userlogindata SET Passwort = ? WHERE webseite = ? AND EMail = ? AND Nutzername = ?';
    const updateValues = [encryptedPassword, webSite, email, username];
    await connection.promise().query(updateQuery, updateValues);

    res.redirect('/passwords');
  } catch (error) {
    console.error('Error updating password:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/accountView', isAuthenticated, (req, res) => {
  const user = {
    vorname: 'User',
    nachname: 'One',
    password: 'password1',
    masterPassword: 'master1',
    department: 'IT'
  };
  res.render('accountView', { user: user });
});

//#region Methode
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


// Middleware zum Überprüfen, ob der Benutzer eingeloggt ist
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    console.log('Benutzer ist authentifiziert:', req.session.user);
    return next();
  } else {
    res.redirect('/');
  }
}

function encrypt(text) {
  let cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv(algorithm, Buffer.from(encryptionKey), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

//#endregion

app.listen(3000, () => {
  console.log('Server läuft auf Port 3000');
});