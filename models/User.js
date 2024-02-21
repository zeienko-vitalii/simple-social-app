const validator = require("validator");
const { getDb } = require("../db");
const userCollection = getDb().db().collection("users");
const bcrypt = require("bcryptjs");
const md5 = require("md5");

let User = function (data, shouldGetAvatar) {
	this.data = data;
	this.errors = [];
	if (shouldGetAvatar) {
		this.getAvatar();
	}
};

User.findByUsername = function (username) {
	return new Promise(async function (resolve, reject) {
		try {
			if (typeof username != "string") {
				reject();
				return;
			}
			let record = await userCollection.findOne({
				username: username.toLowerCase(),
			});
			if (record) {
				record = new User(record, true);
				record = {
					_id: record.data._id,
					username: record.data.username,
					avatar: record.avatar,
				};
				resolve(record);
			} else {
				reject();
			}
		} catch (e) {
			console.error(e);
			reject();
		}
	});
};

User.doesEmailExist = function (email) {
	return new Promise(async function (resolve, reject) {
		try {
			if (typeof email != "string") {
				resolve(false);
				return;
			}
			let record = await userCollection.findOne({ email: email });
			if (record) {
				resolve(true);
			} else {
				resolve(false);
			}
		} catch (e) {
			console.error(e);
			resolve(false);
		}
	});
};

User.prototype.getAvatar = function () {
	this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
};

User.prototype.login = function () {
	return new Promise(async (resolve, reject) => {
		console.log("Login function called");
		this.cleanUp();

		const user = await userCollection.findOne({ username: this.data.username });
		if (user && bcrypt.compareSync(this.data.password, user.password)) {
			this.data = user;
			this.getAvatar();
			resolve("Congrats!");
		} else {
			console.log("Invalid username/password");
			this.errors.push("Invalid username/password.");
			reject(this.errors);
		}
	});
};

User.prototype.register = async function (success, failure) {
	return new Promise(async (resolve, reject) => {
		// Step #1: Validate user data
		this.cleanUp();
		await this.validate();
		// Step #2: Only if there are no validation errors
		// then save the user data into a database
		if (!this.errors.length) {
			// hash user password
			const salt = bcrypt.genSaltSync(10);
			this.data.password = bcrypt.hashSync(this.data.password, salt);
			await userCollection.insertOne(this.data);
			this.getAvatar();
			resolve();
		} else {
			reject(this.errors);
		}
	});
};

User.prototype.cleanUp = function () {
	if (typeof this.data.username != "string") {
		this.data.username = "";
	}
	if (typeof this.data.email != "string") {
		this.data.email = "";
	}
	if (typeof this.data.password != "string") {
		this.data.password = "";
	}

	// get rid of any bogus properties
	this.data = {
		username: this.data.username.trim().toLowerCase(),
		email: this.data.email.trim().toLowerCase(),
		password: this.data.password,
	};
};
User.prototype.validate = function () {
	return new Promise(async (resolve) => {
		if (this.data.username == "") {
			this.errors.push("You must provide a username.");
		}
		if (
			this.data.username != "" &&
			!validator.isAlphanumeric(this.data.username)
		) {
			this.errors.push("Username can only contain letters and numbers.");
		}
		if (!validator.isEmail(this.data.email)) {
			this.errors.push("You must provide a valid email address.");
		}
		if (this.data.password == "") {
			this.errors.push("You must provide a password.");
		}
		if (this.data.password.length > 0 && this.data.password.length < 12) {
			this.errors.push("Password must be at least 12 characters.");
		}
		if (this.data.password.length > 100) {
			this.errors.push("Password cannot exceed 100 characters.");
		}
		if (this.data.username.length > 0 && this.data.username.length < 3) {
			this.errors.push("Username must be at least 3 characters.");
		}
		if (this.data.username.length > 30) {
			this.errors.push("Username cannot exceed 30 characters.");
		}

		// Only if username is valid then check to see if it's already taken
		if (
			this.data.username.length > 2 &&
			this.data.username.length < 31 &&
			validator.isAlphanumeric(this.data.username)
		) {
			const usernameExists = await userCollection.findOne({
				username: this.data.username,
			});
			if (usernameExists) {
				this.errors.push("That username is already taken.");
			}
		}

		// Only if email is valid then check to see if it's already taken
		if (validator.isEmail(this.data.email)) {
			const emailExists = await userCollection.findOne({
				email: this.data.email,
			});
			if (emailExists) {
				this.errors.push("That email is already being used.");
			}
		}
		resolve();
	});
};

module.exports = User;
