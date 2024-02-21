const Post = require("../models/Post");

exports.viewCreateScreen = function (req, res) {
	res.render("create-post");
};

exports.apiCreate = function (req, res) {
	let post = new Post(req.body, req.apiUser._id);
	post
		.create()
		.then(function (postId) {
			res.json("Congrats.");
		})
		.catch(function (errors) {
			res.json(errors);
		});
};

exports.apiDelete = function (req, res) {
	Post.delete(req.params.id, req.apiUser._id)
		.then(function (status) {
			res.json("Success.");
		})
		.catch(function () {
			res.json("You do not have permission to perform that action.");
		});
};

exports.create = function (req, res) {
	let post = new Post(req.body, req.session.user._id);
	post
		.create()
		.then(function (postId) {
			req.flash("success", "New post successfully created.");
			req.session.save(() => res.redirect(`/post/${postId}`));
		})
		.catch(function (errors) {
			errors.forEach((error) => req.flash("errors", error));
			req.session.save(() => res.redirect("/create-post"));
		});
};

exports.delete = function (req, res) {
	Post.delete(req.params.id, req.visitorId)
		.then(function (status) {
			if (status == "success") {
				// post was updated in db
				req.flash("success", "Post successfully deleted.");
				req.session.save(function () {
					res.redirect(`/profile/${req.session.user.username}`);
				});
			} else {
				// post was not updated in db
				post.errors.forEach((error) => req.flash("errors", error));
				req.session.save(() => res.redirect(`/`));
			}
		})
		.catch(function () {
			req.flash("errors", "You do not have permission to perform that action.");
			req.session.save(() => res.redirect("/"));
		});
};

exports.edit = function (req, res) {
	let post = new Post(req.body, req.visitorId, req.params.id);
	post
		.update()
		.then(function (status) {
			if (status == "success") {
				// post was updated in db
				req.flash("success", "Post successfully updated.");
				req.session.save(function () {
					res.redirect(`/post/${req.params.id}/edit`);
				});
			} else {
				// post was not updated in db
				post.errors.forEach((error) => req.flash("errors", error));
				req.session.save(() => res.redirect(`/post/${req.params.id}/edit`));
			}
		})
		.catch(function (errors) {
			req.flash("errors", "You do not have permission to perform that action.");
			req.session.save(() => res.redirect("/"));
		});
};

exports.viewEditScreen = async function (req, res) {
	try {
		let post = await Post.findSingleById(req.params.id, req.visitorId);
		if (post.isVisitorOwner) {
			res.render("edit-post", { post: post });
		} else {
			req.flash("errors", "You do not have permission to perform that action.");
			req.session.save(() => res.redirect("/"));
		}
	} catch (e) {
		res.render("404");
	}
};

exports.viewSingle = async function (req, res) {
	try {
		let postInfo = await Post.findSingleById(req.params.id, req.visitorId);
		res.render("single-post-screen", {
			post: postInfo,
			pageTitle: postInfo.title,
		});
	} catch (e) {
		console.error(e);
		res.render("404");
	}
};

exports.search = function (req, res) {
	Post.search(req.body.searchTerm)
		.then((posts) => {
			res.json(posts);
		})
		.catch(() => {
			res.json([]);
		});
};
