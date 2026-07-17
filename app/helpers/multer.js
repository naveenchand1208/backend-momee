const multer = require('multer');
const path = require('path');
const os = require('os');

// Temporary storage in system temp folder
const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter (optional: accept only images)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const formats = ['.exe', '.bat', '.sh'];

  if (formats.includes(ext)) {
    cb(new Error('This file type is not allowed.'), false);
  } else {
    cb(null, true); 
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
