const express = require('express');
const passport = require('passport');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const LocalStrategy = require('passport-local').Strategy;
const sharp = require('sharp');
const fs = require('fs/promises');

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
  if(req.isAuthenticated()){
    return res.render("find",{username:req.user.username});
  }
  res.render("find",{username:'sign in'});
});

router.get('/find/:user', async function (req, res) {
  try {
    const userData = req.params.user;
    const rData = new RegExp(userData, 'i');

    const data = await UserModel.find({ username: rData });

    if (data.length === 0) {
      return res.status(404).json(undefined);
    }

    res.status(200).json(  data );
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).send('error');
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

    res.render('Profile', { user, username: req.user.username, email: req.user.email,img:req.user.profileImg });
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
      postText: req.body.content,
      postTitle:req.body.title,
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

router.post('/update/post/:postId', isLoggedIn, async function (req, res) {
  try {
    const postId = req.params.postId;

    // Find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      throw new Error('Post not found');
    }

    // Update the post with the new content
    post.postTitle = req.body.title;
    post.postText = req.body.content;
    await post.save();

    res.redirect('/user/profile'); // Redirect to the user profile page after editing
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

router.get('/follower', isLoggedIn, async function(req, res) {
  try {
      const user = await UserModel.findOne({ username: req.user.username }).populate('follower');
      if (!user) {
          return res.status(404).send('User not found');
      }
      console.log(user);
      res.render('follower', { data: user });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});



router.get('/following', isLoggedIn, async function(req, res) {
  try {
      const user = await UserModel.findOne({ username: req.user.username }).populate('following');
      if (!user) {
          return res.status(404).send('User not found');
      }
      console.log(user);
      res.render('following', { data: user });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
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
  try {
    const userData = await UserModel.findOne({ username: req.params.user }).populate('post');
    const folloData = await UserModel.findOne({ username: req.params.user });

    if (!folloData) {
      return res.status(404).send('not-found');
    }

    let userFollow = false;

    if (req.isAuthenticated()) {
      const currentUser = req.user;

      // Check if the current user is following the profile user
      userFollow = currentUser.follower.includes(folloData._id);
    }

    // Check if userData has the expected 'post' property
    if (!userData.post) {
      userData.post = []; // Initialize to an empty array if 'post' is not present
    }

    res.render('FINDProfile', { user: userData, post: userData.post, follow: userFollow ? "Followed" : "Follow",username:userFollow ? req.user.username:'sign in' });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
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
      if (!findUser.following.includes(currentUser._id)) {
        await UserModel.updateOne(
          { _id: findUser._id },
          { $push: { following: currentUser._id } }
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
    res.redirect("/");
  });
});

router.get('/edit/post/:PostId',isLoggedIn,async function(req,res){
  const tiltle = await Post.findOne({ _id: req.params.PostId })
  console.log(tiltle);
  res.render("updatePost",{PostId:req.params.PostId,tiltle})
})

router.get('/chat',(req,res)=>{
  res.send('working on it')
})

router.get("/account/setting", isLoggedIn, function (req, res) {
  res.render('accountSetting',{userPhoto:req.user.profileImg});
});
const multer = require('multer');
const post = require('../models/postModel');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/dp/');
  },
  filename:async function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    console.log(file.filename);
    const result = await UserModel.updateOne(
      { _id: req.user._id },
      { $set: { profileImg: "/dp/"+file.fieldname + '-' + uniqueSuffix + "." + file.mimetype.split("/")[1] } }
    );
  
    cb(null, file.fieldname + '-' + uniqueSuffix + "." + file.mimetype.split("/")[1]);
  }
});

const uploadDP = multer({ storage: storage });

router.post('/upload/dp', isLoggedIn, uploadDP.single('dp'), async function (req, res) {
  try {
    // Check if req.file exists
    if (!req.file) {
      console.log('No file uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    // Use sharp to get image information
    console.log('Image path:', req.file.path);
    const metadata = await sharp(req.file.path).metadata();
    console.log('Image metadata:', metadata);

    const width = metadata.width;
    const height = metadata.height;

    // Check if the image dimensions are exactly 100x100 pixels
    if (width % 100 === 0 && height % 100 === 0 && width == height) {
      // If the image meets the criteria, respond with a success message
      res.redirect("/user/account/Setting");
    } else {
      // If the image doesn't meet the criteria, delete it and respond with an error
      await fs.unlink(req.file.path);
      return res.status(400).send('Image dimensions must be multiples of 100 and should have same width and height.');
    }
  } catch (error) {
    // Handle any errors that occurred during image processing or dimension check
    console.error('Error processing image:', error);
    res.status(500).send('Error processing image.');
  }
});

router.get("/create/post",isLoggedIn,(req,res)=>{
  res.render('createPost')
})

// Middleware to check if the user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/')
}

module.exports = router;
