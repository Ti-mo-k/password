// packages
const express = require ('express');
const mysql = require ('mysql2');
const bcrypt = require ('bcryptjs');
const bodyParser = require('body-parser');
const {check, validationResult} = require ('express-validator')
const path = require('path');
const session = require('express-session');
const nodemailer = require ('nodemailer');
const { error } = require('console');
const crypto = require ('crypto');

//express app
const app = express();

// managing user session
app.use(session({
    secret:'hjbhhlhu;iudb/ljnn;o8409-t5784vpu',
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure:false,
        maxAge: 30 * 60 * 1000
    }
}))

// middleware
app.use(express.json())
app.use(bodyParser.json())
app.use(express.urlencoded({extended:true}))
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname, '/static')))

// routes defination
app.get('/register', (req,res) => {
    res.sendFile(path.join(__dirname,'register.html'))
})
app.get('/login', (req,res) => {
    res.sendFile(path.join(__dirname,'login.html'))
})
app.get('/forgot-password', (req,res) => {
    res.sendFile(path.join(__dirname,'forgotPassword.html'))
})
app.get('/reset-password/:token', (req, res) => {
    const token = req.params.token;

    // Ideally, you should verify if the token is valid and not expired here.
    // For now, render the resetPassword.html form to allow the user to input their new password.

    res.sendFile(path.join(__dirname, 'resetPassword.html'));
});
app.get('/home',checkAuth, (req,res) => {
    res.sendFile(path.join(__dirname,'home.html'))
})

//check user authentication
function checkAuth (req,res,next) {
    if (!req.session.user) {
        res.redirect('/login')
    } else {
       next();
    }
}

// Database connection

const db= mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'Tim200@4',
    database: 'webprac'
    
})
// database connection error handling
db.connect((err) =>{
    if (err) {
        console.log('error connecting to the database', err.message)
    } else {
        console.log('connected to the database')
    }
})

// creating a table for users
const userstable =`
     CREATE TABLE IF NOT EXISTS users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(255) ,
     email VARCHAR(255) UNIQUE NOT NULL,
     password VARCHAR (255) NOT NULL,
     resetPasswordToken VARCHAR(255), 
     resetPasswordExpires DATETIME     
     )
`;
//Error handling
db.query(userstable, (err) =>{
    if (err) {
        console.log('Unable to create the users table', err+message)
    } else {
        console.log('Users table created')
    }
})

app.post('/register',
    check('username')
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
    check('email')
        .isEmail().withMessage('Invalid email format.'),
    check('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character.'),
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if the email is already registered
        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                console.log('Error querying the database');
                return res.status(500).send('Internal server error. Please try again later');
            }
            if (results.length > 0) {
                return res.status(400).json({ error: 'Email is already registered.' });
            }

            // If email is not found, insert the new user
            db.query('INSERT INTO users SET ?', { username, email, password: hashedPassword }, (err) => {
                if (err) {
                    console.log('Error inserting into Users table', err.message);
                    return res.status(500).send('Internal server error. Please try again later');
                }
                else{
                    // res.redirect('/login')
                    return res.status(201).json({ message: 'Registration successful' });
               }
            });
        });
    }
);


app.post('/login', async (req, res) => {
    const {email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.log('database error', err);
            return res.status(500).json({error: 'Server error'});
            
        }

        if (results.length === 0) {
            return res.status(400).json({error: 'Invalid email or password'});
           
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({error: 'Invalid email or password'});
        }

        req.session.user = { id: user.id, username: user.username };
        return res.status(200).json({ message: 'login successful' });
    });
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the user exists
        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('Database query error:', err); // Log the database error
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (results.length === 0) {
                return res.status(400).json({ error: 'No email found' });
            }

            const user = results[0];
            const token = crypto.randomBytes(32).toString('hex');
            const expirationTime = new Date(Date.now() + 3600000); // 1 hour from now

            // Corrected query to update the user's reset token and expiration
            db.query('UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?', [token, expirationTime, user.id], (err) => {
                if (err) {
                    console.error('Error updating user reset token:', err); // Log the update error
                    return res.status(500).json({ error: 'Failed to store reset token' });
                }

                const resetLink = `http://localhost:3000/reset-password/${token}`;
                const mailOptions = {
                    from: 'iamtimkepha@gmail.com',
                    to: email,
                    subject: 'Password Reset',
                    text: `You requested a password reset. Click here to reset your password: ${resetLink}`,
                };

                const transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'iamtimkepha@gmail.com',
                        pass: 'pgcatpakjsftuozh',
                    },
                });

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error('Error sending email:', err); // Log email sending error
                        return res.status(500).json({ error: 'Error sending email' });
                    } else {
                        return res.status(200).json({ message: 'Email sent successfully' });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error:', error); // Log unexpected errors
        return res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Check if the token is valid and not expired
    db.query('SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > NOW()', [token], async (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: 'Database query failed' });
        } 


        console.log("Query results:", results); 
        if ( results.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const user = results[0];

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password and clear the reset token
        db.query('UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?', 
            [hashedPassword, user.id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error resetting password' });
                }
                return res.status(200).json({ message: 'Password has been reset' });
            }
        );
    });
});



//running the app
app.listen(3000, ()=>{
    console.log('app is running on port 3000')
})