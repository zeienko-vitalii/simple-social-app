const { ObjectId } = require("mongodb");
const { getDb } = require("../db");
const postsCollection = getDb().db().collection("posts");
const followsCollection = getDb().db().collection("follows");
const User = require("./User");
const sanatizeHTML = require("sanitize-html");

let Post = function (data, userId, requestedPostId) {
	this.data = data;
	this.errors = [];
	this.userId = userId;
	this.requestedPostId = requestedPostId;
};

Post.countPostsByAuthor = function (profileUserId) {
	return new Promise(async (resolve, reject) => {
		try {
			let postCount = await postsCollection.countDocuments({
				author: profileUserId,
			});
			resolve(postCount);
		} catch (e) {
			console.error(e);
			reject();
		}
	});
};
Post.findByAuthorId = function (author) {
	return Post.postQuery([
		{ $match: { author: author } },
		{ $sort: { createdDate: -1 } },
	]);
};

Post.prototype.actuallyUpdate = function () {
	return new Promise(async (resolve, reject) => {
		this.cleanUp();
		this.validate();
		if (!this.errors.length) {
			await postsCollection.findOneAndUpdate(
				{ _id: new ObjectId(this.requestedPostId) },
				{ $set: { title: this.data.title, body: this.data.body } }
			);
			resolve("success");
		} else {
			resolve("failure");
		}
	});
};

Post.postQuery = function (uniqueOperations, visitorId, finalOperation = []) {
	return new Promise(async (resolve, reject) => {
		try {
			let aggregateOperations = uniqueOperations
				.concat([
					{
						$lookup: {
							from: "users",
							localField: "author",
							foreignField: "_id",
							as: "authorDocument",
						},
					},
					{
						$project: {
							title: 1,
							body: 1,
							createdDate: 1,
							authorId: "$author",
							user: { $arrayElemAt: ["$authorDocument", 0] },
						},
					},
				])
				.concat(finalOperation);

			let posts = await postsCollection
				.aggregate(aggregateOperations)
				.toArray();

			posts.map((post) => {
				post.isVisitorOwner = post.authorId.equals(visitorId);
				post.author = {
					username: post.user.username,
					avatar: new User(post.user, true).avatar,
				};
				post.user = undefined;
				post.authorId = undefined;
				return post;
			});
			resolve(posts);
		} catch (e) {
			console.error(e);
			reject();
		}
	});
};

Post.findSingleById = function (id, visitorId) {
	return new Promise(async (resolve, reject) => {
		try {
			const isValidId = typeof id == "string" && ObjectId.isValid(id);
			if (!isValidId) {
				reject();
				return;
			}
			let posts = await Post.postQuery(
				[{ $match: { _id: new ObjectId(id) } }],
				visitorId
			);

			if (posts.length) {
				resolve(posts[0]);
			} else {
				reject();
			}
		} catch (e) {
			console.error(e);
			reject();
		}
	});
};

Post.prototype.cleanUp = function () {
	if (typeof this.data.title != "string") {
		this.data.title = "";
	}
	if (typeof this.data.body != "string") {
		this.data.body = "";
	}

	this.data = {
		title: sanatizeHTML(this.data.title.trim(), {
			allowedTags: [],
			allowedAttributes: {},
		}),
		body: sanatizeHTML(this.data.body.trim(), {
			allowedTags: [],
			allowedAttributes: {},
		}),
		createdDate: new Date(),
		author: new ObjectId(this.userId),
	};
};

Post.prototype.validate = function () {
	if (this.data.title == "") {
		this.errors.push("You must provide a title.");
	}
	if (this.data.body == "") {
		this.errors.push("You must provide post content.");
	}
};

Post.prototype.create = function () {
	return new Promise((resolve, reject) => {
		this.cleanUp();
		this.validate();

		if (!this.errors.length) {
			// Save post into database
			postsCollection
				.insertOne(this.data)
				.then((post) => {
					resolve(post.insertedId);
				})
				.catch(() => {
					this.errors.push("Please try again later.");
					reject(this.errors);
				});
		} else {
			reject([...this.errors]);
		}
	});
};

Post.prototype.update = function () {
	return new Promise(async (resolve, reject) => {
		try {
			let post = await Post.findSingleById(this.requestedPostId, this.userId);

			if (post.isVisitorOwner) {
				// actually update the db
				let status = await this.actuallyUpdate();
				resolve(status);
			} else {
				req.flash(
					"errors",
					"You do not have permission to perform that action."
				);
				req.session.save(() => res.redirect("/"));
			}
		} catch (e) {
			reject(e);
		}
	});
};

Post.delete = function (postIdToDelete, userId) {
	return new Promise(async (resolve, reject) => {
		try {
			let post = await Post.findSingleById(postIdToDelete, userId);

			if (post.isVisitorOwner) {
				// actually update the db
				let result = await postsCollection.deleteOne({
					_id: new ObjectId(postIdToDelete),
				});
				console.log("deleted result: " + result);
				resolve("success");
			} else {
				console.error("You do not have permission to perform that action.");
				req.flash(
					"errors",
					"You do not have permission to perform that action."
				);
				req.session.save(() => res.redirect("/"));
			}
		} catch (e) {
			console.error(e);
			reject(e);
		}
	});
};

Post.search = function (searchTerm) {
	return new Promise(async (resolve, reject) => {
		if (typeof searchTerm == "string") {
			let posts = await Post.postQuery(
				[{ $match: { $text: { $search: searchTerm } } }],
				undefined,
				[{ $sort: { score: { $meta: "textScore" } } }]
			);
			resolve(posts);
		} else {
			reject();
		}
	});
};

Post.getFeed = function (userId) {
	return new Promise(async (resolve, reject) => {
		try {
			// create an array of user ids that the current user follows
			let followedUsers = await followsCollection
				.find({ authorId: new ObjectId(userId) })
				.toArray();

			followedUsers = followedUsers.map((followDoc) => {
				return followDoc.followedId;
			});
			// look for posts where the author is in the above array of followed users
			let posts = await Post.postQuery([
				{ $match: { author: { $in: followedUsers } } },
				{ $sort: { createdDate: -1 } },
			]);

			resolve(posts);
		} catch (e) {
			console.error(e);
			reject();
		}
	});
};

module.exports = Post;
