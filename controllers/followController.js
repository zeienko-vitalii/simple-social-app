const Follow = require("../models/Follow");

exports.removeFollow = async function (req, res) {
	let followUsernaem = req.params.username;
	let follow = new Follow(followUsernaem, req.visitorId);
	follow
		.delete()
		.then(() => {
			req.flash("success", `Successfully stopped following ${followUsernaem}`);
			req.session.save(() => res.redirect(`/profile/${followUsernaem}`));
		})
		.catch((errors) => {
			errors.forEach((error) => {
				req.flash("errors", error);
			});
			req.session.save(() => res.redirect(`/profile/${followUsernaem}`));
		});
};

exports.addFollow = async function (req, res) {
	let followUsernaem = req.params.username;
	let follow = new Follow(followUsernaem, req.visitorId);
	follow
		.create()
		.then(() => {
			req.flash("success", `Successfully followed ${followUsernaem}`);
			req.session.save(() => res.redirect(`/profile/${followUsernaem}`));
		})
		.catch((errors) => {
			errors.forEach((error) => {
				req.flash("errors", error);
			});
		});
};
