const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref:"User"
  },
  postText:{
    type:String
  },
  postTitle:{
    type:String
  }
  // Add more fields as needed
},{ timestamps: true });

const post = mongoose.model('Post', postSchema);

module.exports = post;
