const { getDb } = require("../db");
const usersCollection = getDb().db().collection("users");
const followsCollection = getDb().db().collection("follows");
const ObjectId = require("mongodb").ObjectId;
const User = require("./User");

const _validationDeleteAction = "delete";
const _validationCreateAction = "create";

let Follow = function (followedUsername, authorId) {
	this.followedUsername = followedUsername;
	this.authorId = authorId;
	this.errors = [];
};

Follow.prototype.cleanUp = function () {
	if (typeof this.followedUsername != "string") {
		this.followedUsername = "";
	}
};

Follow.prototype.validate = async function (action) {
	// check exist
	let followedAccount = await usersCollection.findOne({
		username: this.followedUsername,
	});
	if (followedAccount) {
		// keep followedAccount's id in the Follow's prototype
		this.followedId = followedAccount._id;
	} else {
		this.errors.push("You cannot follow a user that does not exist.");
	}

	let doesFollowAlreadyExist = await followsCollection.findOne({
		followedId: this.followedId,
		authorId: new ObjectId(this.authorId),
	});

	if (action == _validationCreateAction && doesFollowAlreadyExist) {
		this.errors.push("You are already following this user.");
	} else if (action == _validationDeleteAction && !doesFollowAlreadyExist) {
		this.errors.push(
			"You cannot stop following someone you do not already follow."
		);
	}

	// should not follow yourself

	if (this.followedId.equals(this.authorId)) {
		this.errors.push("You cannot follow yourself.");
	}
};

Follow.getFollowingById = function (id) {
	return new Promise(async (resolve, reject) => {
		try {
			let following = await followsCollection
				.aggregate([
					{ $match: { authorId: id } },
					{
						$lookup: {
							from: "users",
							localField: "followedId",
							foreignField: "_id",
							as: "userDoc",
						},
					},
					{
						$project: {
							username: { $arrayElemAt: ["$userDoc.username", 0] },
							email: { $arrayElemAt: ["$userDoc.email", 0] },
						},
					},
				])
				.toArray();
			console.log("followers: ", following);
			following = following.map(function (follower) {
				let user = new User(follower, true);
				return {
					username: follower.username,
					avatar: user.avatar,
				};
			});
			resolve(following);
		} catch (e) {
			console.error(e);
			reject(e);
		}
	});
};

Follow.getFollowersById = function (id) {
	return new Promise(async (resolve, reject) => {
		try {
			let followers = await followsCollection
				.aggregate([
					{ $match: { followedId: id } },
					{
						$lookup: {
							from: "users",
							localField: "authorId",
							foreignField: "_id",
							as: "userDoc",
						},
					},
					{
						$project: {
							username: { $arrayElemAt: ["$userDoc.username", 0] },
							email: { $arrayElemAt: ["$userDoc.email", 0] },
						},
					},
				])
				.toArray();
			console.log("followers: ", followers);
			followers = followers.map(function (follower) {
				let user = new User(follower, true);
				return {
					username: follower.username,
					avatar: user.avatar,
				};
			});
			resolve(followers);
		} catch (e) {
			console.error(e);
			reject(e);
		}
	});
};

Follow.isVisitorFollowing = function (followedId, visitorId) {
	return new Promise(async (resolve, reject) => {
		let followDoc = await followsCollection.findOne({
			followedId: followedId,
			authorId: new ObjectId(visitorId),
		});

		if (followDoc) {
			resolve(true);
		} else {
			resolve(false);
		}
	});
};

Follow.prototype.delete = function () {
	return new Promise(async (resolve, reject) => {
		try {
			this.cleanUp();
			await this.validate(_validationDeleteAction);
			if (this.errors.length) {
				reject(this.errors);
				return;
			} else {
				await followsCollection.deleteOne({
					followedId: this.followedId,
					authorId: new ObjectId(this.authorId),
				});
				resolve();
			}
		} catch (e) {
			console.error(e);
			this.errors.push(e.message);
			reject(this.errors);
		}
	});
};

Follow.prototype.create = function () {
	return new Promise(async (resolve, reject) => {
		try {
			this.cleanUp();
			await this.validate(_validationCreateAction);
			if (this.errors.length) {
				reject(this.errors);
				return;
			} else {
				await followsCollection.insertOne({
					followedId: this.followedId,
					authorId: new ObjectId(this.authorId),
				});
				resolve();
			}
		} catch (e) {
			console.error(e);
		}
	});
};

Follow.countFollowersById = function (profileUserId) {
	return new Promise(async (resolve, reject) => {
		try {
			let followersCount = await followsCollection.countDocuments({
				followedId: profileUserId,
			});

			resolve(followersCount);
		} catch(e) {
			console.error(e);
			reject(e);
		}
	});
};

Follow.countFollowingById = function (profileUserId) {
	return new Promise(async (resolve, reject) => {
		try {
			let followingCount = await followsCollection.countDocuments({
				authorId: profileUserId,
			});

			resolve(followingCount);
		} catch(e) {
			console.error(e);
			reject(e);
		}
	});
};

module.exports = Follow;
