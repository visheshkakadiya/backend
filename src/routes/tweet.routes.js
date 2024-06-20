import {Router} from 'express'
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'
import { createTweet, deleteTweet, getUserTweets, updteTweet } from '../controllers/tweet.controller.js';

const router = Router();

router.use(verifyJWT, upload.none()) //Apply verifyJWT middleware to all routes in this file

router.route("/").post(createTweet)
router.route("/user/:userId").get(getUserTweets)
router.route("/:tweetId").patch(updteTweet).delete(deleteTweet)

export default router;