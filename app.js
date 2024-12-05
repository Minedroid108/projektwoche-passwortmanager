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

//#region Login DONE!

app.get('/', function (req, res) {
  res.render('login', {
    title: 'Login'
  });
});

app.post('/login', async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const queryUsername = "SELECT ID, LoginPasswort FROM user WHERE Nutzername = ?";
    const valuesUsername = [username];
    const results = await executeSQL(queryUsername, valuesUsername);

    if (results.length === 0) {
      return res.send('Benutzer existiert nicht');
    }

    const user = results[0];
    const passwordHash = user.LoginPasswort;

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (isMatch) {
      req.session.user = user.ID; // Speichern Sie Benutzerdaten in der Session
      console.log('Login erfolgreich, Benutzer-ID:', user.ID);
      res.redirect('/passwords'); // Weiterleitung zur passwordView-Seite
    } else {
      res.send('Falsches Passwort');
    }
  } catch (error) {
    console.error('Error during login:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

//#endregion

//#region User DONE!

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
  console.log(loginPasswort, masterPasswort);

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

app.get('/userlist', isAuthenticated, async (req, res) => {
  // get Users
  const queryUsers = 'SELECT * FROM user;';
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

//#endregion

//#region Abteilungen

app.get('/deparmentList', isAuthenticated, (req, res) => {
  const query = 'SELECT Abteilungen, COUNT(UserID) AS quantityOfUser FROM abteilung GROUP BY Abteilungen';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Fehler bei der Abfrage:', err);
      res.status(500).send('Fehler bei der Abfrage');
      return;
    }
    res.render('deparmentList', { deparmentLists: results });
  });
});

app.post('/addDepartment', isAuthenticated, (req, res) => {
  const newDepartment = {
    deparmentList: req.body.deparmentName,
    quantityOfUser: 0, // Standardwert für neue Abteilungen
    users: []
  };
  const query = 'INSERT INTO abteilung (Abteilungen) VALUES (?)';
  connection.query(query, [newDepartment.deparmentList], (err, results) => {
    if (err) {
      console.error('Fehler bei der Abfrage:', err);
      res.status(500).send('Fehler bei der Abfrage');
      return;
    }
    res.redirect('/deparmentList');
  });
});

app.get('/editDepartment/:deparmentList', isAuthenticated, (req, res) => {
  const query = 'SELECT * FROM abteilung WHERE Abteilungen = ?';
  connection.query(query, [req.params.deparmentList], (err, results) => {
    if (err) {
      console.error('Fehler bei der Abfrage:', err);
      res.status(500).send('Fehler bei der Abfrage');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Abteilung nicht gefunden');
      return;
    }

    const department = {
      deparmentList: results[0].Abteilungen,
      users: []
    };

    // Abfrage, um die Benutzer der Abteilung zu erhalten
    const userQuery = `
      SELECT u.Nutzername, u.Vorname, u.Nachname
      FROM user u
      JOIN abteilung a ON u.ID = a.UserID
      where a.Abteilungen = ?;
    `;
    connection.query(userQuery, [req.params.deparmentList], (userErr, userResults) => {
      if (userErr) {
        console.error('Fehler bei der Benutzerabfrage:', userErr);
        res.status(500).send('Fehler bei der Benutzerabfrage');
        return;
      }
      department.users = userResults;
      res.render('editDepartment', { department });
    });
  });
});

app.post('/addDepartment', isAuthenticated, (req, res) => {
  const userID = req.session.userID;
  console.log(userID);
  const newDepartment = {
    deparmentList: req.body.deparmentName,
    quantityOfUser: 0, // Standardwert für neue Abteilungen
    users: []
  };
  const query = 'INSERT INTO abteilung (Abteilungen) VALUES (?)';
  connection.query(query, [newDepartment.deparmentList, userID], (err, results) => {
    if (err) {
      console.error('Fehler bei der Abfrage:', err);
      res.status(500).send('Fehler bei der Abfrage');
      return;
    }
    res.redirect('/deparmentList');
  });
});
//#endregion

//#region Einstellungen
app.get('/companySettings', isAuthenticated, (req, res) => {
  res.render('companySettings');
});

//#endregion

//#region Passwortverwaltung DONE!

app.get('/passwords', isAuthenticated, async (req, res) => {
  try {
    const query = 'SELECT webseite, EMail, Nutzername, Passwort FROM userlogindata Where userID = ?';
    const values = [req.session.user];
    new Promise(async (resolve, reject) => {
      const passwords = await executeSQL(query, values);
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
  const { webseite, EMail, Nutzername, Passwort } = req.query;
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

//#endregion

//#region AccountView DONE!

app.get('/accountView', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user; // Assuming you have user ID in req.user
    const query = 'SELECT ID, Vorname, Nachname, Nutzername, IsAdmin, LoginPasswort, MasterPasswort FROM User WHERE ID = ?';
    const queryAbteilungen = 'SELECT * FROM abteilung;';
    const abteilungen = await executeSQL(queryAbteilungen);
    connection.query(query, [userId], (err, result) => {
      if (err) {
        throw err;
      }
      const user = result[0];
      console.log(user)
      res.render('accountView', { 
        user: user, 
        abteilungen: abteilungen
      });
    });
  } catch (error) {
    console.error('Error fetching account:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/accountView', isAuthenticated, async (req, res) => {
  const userId = req.session.user; // Assuming you have user ID in req.user
  const { vorname, nachname, password, masterPassword } = req.body;

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
  const hashedMasterPassword = masterPassword ? await bcrypt.hash(masterPassword, 10) : null;

  const query = 'UPDATE User SET Vorname = ?, Nachname = ?, LoginPasswort = ?, MasterPasswort = ?';
  const values = [vorname, nachname, hashedPassword, hashedMasterPassword, department, userId];

  connection.query(query, values, (err, result) => {
    if (err) {
      console.error('Error updating user:', err.stack);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.redirect('/accountView');
  });
});

//#endregion

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