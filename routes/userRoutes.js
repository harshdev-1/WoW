const express = require('express');
const passport = require('passport');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const LocalStrategy = require('passport-local').Strategy;

const upload = require('../middlewares/multer');
const UserModel = require('../models/userModel');

const router = express.Router();

// Login route to render the login form
router.get('/login', (req, res) => {
  res.render('login');
});

// Use a custom LocalStrategy for authentication
passport.use(
  new LocalStrategy(async (username, password, done) => {
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
  })
);

router.post('/login', passport.authenticate('local', {
  successRedirect: '/user/Profile',
  failureRedirect: '/',
}));

// Signup route to render the signup form
router.get('/signup', (req, res) => {
  res.render('signup');
});

router.get("/", (req, res) => {
  res.render("find");
});

router.get('/find/:user', async function (req, res) {
  try {
    const userData = req.params.user;
    const rData = new RegExp(userData, 'i');

    const data = await UserModel.find({ username: rData });

    if (data.length === 0) {
      return res.status(404).render('not-found', { message: 'User not found' });
    }

    res.status(200).render('found-users', { users: data });
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

// Signup route to handle form submission
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const newUser = new User({ username, password, email });

    await User.register(newUser, password);

    req.login(newUser, (err) => {
      if (err) {
        console.error(err);
        return res.render('error', { message: 'Internal Server Error' });
      }

      res.redirect('/user/Profile');
    });
  } catch (error) {
    console.error(error);
    res.render('error', { message: 'Internal Server Error' });
  }
});

// Profile route accessible only if authenticated
router.get('/Profile', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('post');

    res.render('Profile', { user, username: req.user.username, email: req.user.email });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

router.post('/post', isLoggedIn, upload.single('input-b1'), async function (req, res) {
  try {
    if (!req.user || !req.user._id) {
      throw new Error('User information not available');
    }

    const userId = req.user._id;
    const post = await Post.create({
      userId,
      postText: req.body.PostText,
    });

    const user = await User.findOne({ username: req.user.username });
    await user.post.push(post._id);
    await user.save();

    res.redirect('/user/profile'); // Redirect to the user profile page after posting
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

router.get("/:user", async function (req, res) {
  try {
    const username = req.params.user;
    const regex = new RegExp('^' + username + "$", "i");

    const data = await User.findOne({ username: regex });

    if (!data) {
      return res.json("Available");
    } else {
      return res.json("Not available");
    }
  } catch (error) {
    console.error("Error checking username availability:", error);
    return res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

router.get("/profile/:user", async function (req, res) {
  const data = await UserModel.findOne({ username: req.params.user });
  const post = await UserModel.findOne({ username: req.params.user }).populate('post');
  if (!data) {
    return res.status(404).render('not-found', { message: 'User not found' });
  }
  res.render('user-profile', { user: data, post });
});

router.get("/add-follower/:user", isLoggedIn, async function (req, res) {
  try {
    const findUser = await UserModel.findOne({ username: req.params.user });
    const currentUser = await UserModel.findOne({ username: req.user.username });

    if (findUser && currentUser && currentUser.follower) {
      if (!currentUser.follower.includes(findUser._id)) {
        await UserModel.updateOne(
          { _id: req.user._id },
          { $push: { follower: findUser._id } }
        );
      }
    }

    res.redirect('/user/profile'); // Redirect to the user profile page after adding a follower
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

// Logout route
router.post('/logout', function (req, res) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.json({ success: true, message: 'Logout successful' });
  });
});

router.post("/account/setting", isLoggedIn, function (req, res) {
  res.render('accountSetting');
});

// Middleware to check if the user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).render('unauthorized', { message: 'Unauthorized' });
}

module.exports = router;
