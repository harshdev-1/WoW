const userModel = require('../models/userModel')
const multer = require('multer')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/upload/')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      console.log(file.filename)
      cb(null, file.fieldname + '-' + uniqueSuffix +"."+file.mimetype.split("/")[1] )
    }
  })
 
const upload = multer({ storage: storage })

module.exports = upload