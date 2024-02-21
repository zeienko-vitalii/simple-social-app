const User = require("../models/User");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const jwt = require("jsonwebtoken");

exports.apiGetPostsByUsername = async function (req, res) {
	try {
		let authorDoc = await User.findByUsername(req.params.username);
		let posts = await Post.findByAuthorId(authorDoc._id);
		res.json(posts);
	} catch (e) {
		console.error(e);
		res.json("Sorry, invalid user requested.");
	}
};

exports.apiMustBeLoggedIn = async function (req, res, next) {
	try {
		req.apiUser = jwt.verify(
			req.body.token,
			process.env.JWT_SECRET
			// function (err, decoded) {
			// 	if (decoded) {
			// 		next();
			// 	} else {
			// 		res.json("Sorry, you must provide a valid token.");
			// 	}
			// }
		);
		next();
	} catch (e) {
		console.error(e);
		res.json("Sorry, you must provide a valid token.");
	}
};

exports.loggedInMiddleware = async function (req, res, next) {
	try {
		if (req.session.user) {
			next();
		} else {
			req.flash("errors", "You must be logged in to perform that action.");
			req.session.save(() => {
				res.redirect("/");
			});
		}
	} catch (e) {
		console.error(e);
		res.send("Sorry, try again later.");
	}
};

exports.ifUserExists = async function (req, res, next) {
	try {
		User.findByUsername(req.params.username)
			.then(function (userDocument) {
				req.profileUser = userDocument;
				next();
			})
			.catch(function () {
				res.render("404");
			});
	} catch (e) {
		console.error(e);
		res.render("404");
	}
};

exports.sharedProfileData = async function (req, res, next) {
	try {
		let isFollowing = false;
		let isVisitorsProfile = false;

		if (req.session.user) {
			isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);
			isFollowing = await Follow.isVisitorFollowing(
				req.profileUser._id,
				req.visitorId
			);
		}

		req.isVisitorsProfile = isVisitorsProfile;
		req.isFollowing = isFollowing;

		// retrieve post, follower, and following counts
		let postCountPromise = Post.countPostsByAuthor(req.profileUser._id);
		let followerCountPromise = Follow.countFollowersById(req.profileUser._id);
		let followingCountPromise = Follow.countFollowingById(req.profileUser._id);

		let [postCount, followerCount, followingCount] = await Promise.all([
			postCountPromise,
			followerCountPromise,
			followingCountPromise,
		]);

		req.postCount = postCount;
		req.followerCount = followerCount;
		req.followingCount = followingCount;

		next();
	} catch (e) {
		console.error(e);
		res.send("Sorry, try again later.");
	}
};

exports.profilePostsScreen = async function (req, res, next) {
	try {
		await Post.findByAuthorId(req.profileUser._id)
			.then(function (posts) {
				res.render("profile", {
					currentPage: "posts",
					pageTitle: `Profile for ${req.profileUser.username}`,
					posts: posts,
					profileUsername: req.profileUser.username,
					profileAvatar: req.profileUser.avatar,
					isFollowing: req.isFollowing,
					isVisitorsProfile: req.isVisitorsProfile,
					counts: {
						postCount: req.postCount,
						followerCount: req.followerCount,
						followingCount: req.followingCount,
					},
				});
			})
			.catch(function () {
				res.render("404");
			});
	} catch (e) {
		console.error(e);
		res.render("404");
	}
};

exports.apiLogin = async function (req, res) {
	try {
		let user = new User(req.body);
		user
			.login()
			.then(() => {
				res.json(
					jwt.sign({ _id: user.data._id }, process.env.JWT_SECRET, {
						expiresIn: "7d",
					})
				);
			})
			.catch((err) => {
				res.json("Sorry, try again: " + err.message);
			});
	} catch (e) {
		console.error(e);
		res.send("Sorry, try again later.");
	}
};

exports.login = async function (req, res) {
	try {
		let user = new User(req.body);
		user
			.login()
			.then(() => {
				req.session.user = {
					avatar: user.avatar,
					username: user.data.username,
					_id: user.data._id,
				};
				req.session.save(() => {
					res.redirect("/");
				});
			})
			.catch((err) => {
				req.flash("errors", err);
				req.session.save(() => {
					res.redirect("/");
				});
			});
	} catch (e) {
		console.error(e);
		res.send("Sorry, try again later.");
	}
};

exports.register = async function (req, res) {
	try {
		console.log(req.body);
		let user = new User(req.body);
		user
			.register()
			.then(() => {
				req.session.user = {
					avatar: user.avatar,
					username: user.data.username,
					_id: user.data._id,
				};
				req.session.save(() => {
					res.redirect("/");
				});
			})
			.catch((err) => {
				err.forEach((err) => {
					req.flash("regErrors", err);
				});
				req.session.save(() => {
					res.redirect("/");
				});
			});
	} catch (e) {
		console.error(e);
		res.send("Sorry, try again later.");
	}
};

exports.logout = function (req, res) {
	try {
		req.session.destroy(() => {
			res.redirect("/");
		});
	} catch (e) {
		console.error(e);
		res.send("Sorry, try again later.");
	}
};

exports.home = async function (req, res) {
	if (req.session.user) {
		let posts = await Post.getFeed(req.session.user._id);
		res.render("home-dashboard", {
			posts: posts,
			avatar: req.session.user.avatar,
			username: req.session.user.username,
		});
	} else {
		res.render("home-guest", {
			regErrors: req.flash("regErrors"),
		});
	}
};

exports.profileFollowersScreen = async function (req, res) {
	try {
		let followers = await Follow.getFollowersById(req.profileUser._id);

		res.render("profile-followers", {
			currentPage: "followers",
			followers: followers,
			profileUsername: req.profileUser.username,
			profileAvatar: req.profileUser.avatar,
			isFollowing: req.isFollowing,
			isVisitorsProfile: req.isVisitorsProfile,
			counts: {
				postCount: req.postCount,
				followerCount: req.followerCount,
				followingCount: req.followingCount,
			},
		});
	} catch (e) {
		res.render("404");
	}
};

exports.profileFollowingScreen = async function (req, res) {
	try {
		let following = await Follow.getFollowingById(req.profileUser._id);

		res.render("profile-following", {
			currentPage: "following",
			following: following,
			profileUsername: req.profileUser.username,
			profileAvatar: req.profileUser.avatar,
			isFollowing: req.isFollowing,
			isVisitorsProfile: req.isVisitorsProfile,
			counts: {
				postCount: req.postCount,
				followerCount: req.followerCount,
				followingCount: req.followingCount,
			},
		});
	} catch (e) {
		res.render("404");
	}
};

exports.doesUsernameExist = function (req, res) {
	User.findByUsername(req.body.username)
		.then(function () {
			res.json(true);
		})
		.catch(function () {
			res.json(false);
		});
};

exports.doesEmailExist = function (req, res) {
	User.doesEmailExist(req.body.email)
		.then(function (status) {
			res.json(status);
		})
		.catch(function () {
			res.json(false);
		});
};
