const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const User = require('./models/userModel');
const userRoutes = require('./routes/userRoutes');
const path = require('path');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb+srv://harsh:harsh1234@inportant.gaqsygs.mongodb.net/?retryWrites=true&w=majority');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Enable sessions
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware function to check if user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Set up routes
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.render('index', { username: req.user.username });
  }
  res.render('index', { username: 'sign in' });
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.render('index', { username: req.user.username });
  }
  res.render('login', { username: 'sign in' });
});

// Mount the userRoutes under the '/user' path
app.use('/user', userRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
