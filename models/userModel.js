// userModel.js
const { Schema, model } = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const mongoose = require('mongoose')

const userSchema = new Schema({
  username: String,
  email: String,
  password: String,
  profileImg: {
    type: String,
    default: "/image/default.png"
  },
  role: {
    type: String,
    enum: ["USER", "ADMIN"],
    default: "USER"
  },
  post:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Post"
  }]
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose);

// Use a unique name for the model
const UserModel = model("User", userSchema);

module.exports = UserModel;
