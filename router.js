const express = require("express");
const router = express.Router();
const userController = require("./controllers/userController");
const postController = require("./controllers/postController");
const followController = require("./controllers/followController");

router.get("/", userController.home);

// user
router.post("/login", userController.login);
router.post("/register", userController.register);
router.post("/logout", userController.logout);
router.post("/doesUsernameExist", userController.doesUsernameExist);
router.post("/doesEmailExist", userController.doesEmailExist);

// profile related routes
// profile-posts
router.get(
	"/profile/:username",
	userController.ifUserExists,
	userController.sharedProfileData,
	userController.profilePostsScreen
);
router.get(
	"/profile/:username/followers",
	userController.ifUserExists,
	userController.sharedProfileData,
	userController.profileFollowersScreen
);
router.get(
	"/profile/:username/following",
	userController.ifUserExists,
	userController.sharedProfileData,
	userController.profileFollowingScreen
);

// post related routes
router.get(
	"/create-post",
	userController.loggedInMiddleware,
	postController.viewCreateScreen
);
router.post(
	"/create-post",
	userController.loggedInMiddleware,
	postController.create
);

// single post related routes
router.get("/post/:id", postController.viewSingle);
router.get(
	"/post/:id/edit",
	userController.loggedInMiddleware,
	postController.viewEditScreen
);
router.post(
	"/post/:id/edit",
	userController.loggedInMiddleware,
	postController.edit
);
router.post(
	"/post/:id/delete",
	userController.loggedInMiddleware,
	postController.delete
);

// search
router.post("/search", postController.search);

// Follow
router.post(
	"/addFollow/:username",
	userController.loggedInMiddleware,
	followController.addFollow
);
router.post(
	"/removeFollow/:username",
	userController.loggedInMiddleware,
	followController.removeFollow
);

module.exports = router;
