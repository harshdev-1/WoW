const express = require('express');
const passport = require('passport');
const User = require('../models/userModel'); // Adjust the path based on your project structure
const Post = require('../models/postModel')
const LocalStrategy = require('passport-local').Strategy;

const router = express.Router();

// Login route to render the login form
router.get('/login', (req, res) => {
  res.send(`Login Page ${req.user ? req.user.username : ''}`);
});

// Use a custom LocalStrategy for authentication
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      const isValidPassword = await user.verifyPassword(password);

      if (!isValidPassword) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

router.post('/login', passport.authenticate('local', {
  successRedirect: '/user/Profile',
  failureRedirect: '/user/login',
  failureFlash: true
}));

// Signup route to render the signup form
router.get('/signup', (req, res) => {
  res.send('Signup Page');
});

// Signup route to handle form submission
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Create a new user
    const newUser = new User({ username, password,email });

    // Register the user with a hashed password
    await User.register(newUser, password);

    // Log in the user after successful signup
    req.login(newUser, (err) => {
      if (err) {
        console.error(err);
        return res.redirect('/user/login');
      }

      // Redirect to the Profile with the username available in req.user
      res.redirect('/user/Profile');
    });
  } catch (error) {
    console.error(error);
    res.redirect('/'); // Handle the error appropriately
  }
});

// Profile route accessible only if authenticated
router.get('/Profile', isLoggedIn, (req, res) => {
  res.render(`Profile`,{username:req.user.username,email:req.user.email});
});

router.post('/post', isLoggedIn, async function(req, res) {
  try {
    if (!req.user || !req.user._id) {
      // Handle the case where user information is not available
      throw new Error('User information not available');
    }

    const userId = req.user._id;
    const post = await Post.create({
      userId,
      postText: req.body.PostText,
    });

    const user = await User.findOne({username:req.user.username})
    await user.post.push(post._id)
    await user.save();

    res.redirect("/user/profile");
  } catch (error) {
    console.error(error);
    // Handle the error appropriately, e.g., send an error response
    res.status(500).send('Internal Server Error');
  }
});


router.get("/:user",async function(req,res){
  data = await User.findOne({username:req.params.user})
  if (data == undefined){
    return res.json("Available")
  }
  else{
    return res.json("Not available")
  }
})

// Logout route
router.post('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});
// Middleware to check if the user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

module.exports = router;
