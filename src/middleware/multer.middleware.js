import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)     // This can be updated to store the unique files.
  }
})

export const upload = multer({ 
        storage, 
    }
);