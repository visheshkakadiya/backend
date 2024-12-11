import multer from "multer";
import { v4 as uuidv4 } from "uuid"; // To generate unique IDs for file names

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({ storage });
