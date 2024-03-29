import axios from "axios";

export default class RegistrationForm {
	constructor() {
		this._csrf = document.querySelector('[name="_csrf"]').value;
		this.form = document.querySelector("#registration-form");
		this.allFields = document.querySelectorAll(
			"#registration-form .form-control"
		);
		this.insertValidationElements();
		this.username = document.querySelector("#username-register");
		this.username.previousValue = "";
		this.email = document.querySelector("#email-register");
		this.email.previousValue = "";
		this.password = document.querySelector("#password-register");
		this.password.previousValue = "";

		this.username.isUnique = false;
		this.email.isUnique = false;
		this.events();
	}

	// Events
	events() {
		this.form.addEventListener("submit", (e) => {
			e.preventDefault();
			this.formSubmitHandler();
		});
		this.username.addEventListener("keyup", () => {
			this.isDifferent(this.username, this.usernameHandler);
		});
		this.email.addEventListener("keyup", () => {
			this.isDifferent(this.email, this.emailHandler);
		});
		this.password.addEventListener("keyup", () => {
			this.isDifferent(this.password, this.passwordHandler);
		});
		this.username.addEventListener("blur", () => {
			this.isDifferent(this.username, this.usernameHandler);
		});
		this.email.addEventListener("blur", () => {
			this.isDifferent(this.email, this.emailHandler);
		});
		this.password.addEventListener("blur", () => {
			this.isDifferent(this.password, this.passwordHandler);
		});
	}

	// Methods
	formSubmitHandler() {
		this.usernameImmediately();
		this.usernameAfterDelay();
		this.emailAfterDelay();
		this.passwordImmediately();
		this.passwordAfterDelay();

		let isUsernameValid = this.username.isUnique && !this.username.errors;
		let isEmailValid = this.email.isUnique && !this.email.errors;
		let isPasswordValid = !this.password.errors;

		if (isUsernameValid && isEmailValid && isPasswordValid) {
			this.form.submit();
		}
	}

	isDifferent(el, handler) {
		if (el.previousValue != el.value) {
			handler.call(this);
		}
		el.previousValue = el.value;
	}

	usernameHandler() {
		this.username.errors = false;
		this.usernameImmediately();
		clearTimeout(this.username.timer);
		this.username.timer = setTimeout(() => this.usernameAfterDelay(), 800);
	}

	emailHandler() {
		this.email.errors = false;
		clearTimeout(this.email.timer);
		this.email.timer = setTimeout(() => this.emailAfterDelay(), 800);
	}

	passwordHandler() {
		this.password.errors = false;
		this.passwordImmediately();
		clearTimeout(this.password.timer);
		this.password.timer = setTimeout(() => this.passwordAfterDelay(), 800);
	}

	emailAfterDelay() {
		if (!/^\S+@\S+$/.test(this.email.value)) {
			this.showValidationError(
				this.email,
				"You must provide a valid email address."
			);
		}
		if (!this.email.errors) {
			axios
				.post("/doesEmailExist", { email: this.email.value, _csrf: this._csrf })
				.then((response) => {
					if (response.data) {
						this.email.isUnique = false;
						this.showValidationError(
							this.email,
							"That email is already being used."
						);
					} else {
						this.email.isUnique = true;
						this.hideValidationError(this.email);
					}
				})
				.catch(() => {
					console.log("Please try again later.");
				});
		}
	}

	usernameImmediately() {
		let isEmpty = this.username.value != "";
		let isNotCharactersAndDigits = !/^([a-zA-Z0-9]+)$/.test(
			this.username.value
		);
		if (isEmpty && isNotCharactersAndDigits) {
			this.showValidationError(
				this.username,
				"Username can only contain letters and numbers."
			);
		}

		if (this.username.value.length > 30) {
			this.showValidationError(
				this.username,
				"Username cannot exceed 30 characters."
			);
		}

		if (!this.username.errors) {
			this.hideValidationError(this.username);
		}
	}

	passwordImmediately() {
		let isMoreThan50Chars = this.password.value.length > 50;

		if (isMoreThan50Chars) {
			this.showValidationError(
				this.password,
				"Password cannot exceed 50 characters."
			);
		}

		if (!this.password.errors) {
			this.hideValidationError(this.password);
		}
	}

	passwordAfterDelay() {
		let isLessThan12Chars = this.password.value.length < 12;
		if (isLessThan12Chars) {
			this.showValidationError(
				this.password,
				"Password must be at least 12 characters."
			);
		}
	}

	usernameAfterDelay() {
		if (this.username.value.length < 3) {
			this.showValidationError(
				this.username,
				"Username must be at least 3 characters."
			);
		}
		if (!this.username.errors) {
			axios
				.post("/doesUsernameExist", {
					username: this.username.value,
					_csrf: this._csrf,
				})
				.then((response) => {
					if (response.data) {
						this.showValidationError(
							this.username,
							"That username is already taken."
						);
						this.username.isUnique = false;
					} else {
						this.username.isUnique = true;
					}
				})
				.catch(() => {
					console.log("Please try again later.");
				});
		}
	}

	showValidationError(el, message) {
		el.nextElementSibling.innerHTML = message;
		el.nextElementSibling.classList.add("liveValidateMessage--visible");
		el.errors = true;
	}

	hideValidationError(el) {
		el.nextElementSibling.classList.remove("liveValidateMessage--visible");
	}

	// isUsernameUnique() {
	// 	if (this.username.isUnique) {
	// 		this.hideValidationError(this.username);
	// 	}
	// }

	insertValidationElements() {
		console.log(
			"allFields: " + this.allFields + " length: " + this.allFields.length
		);
		this.allFields.forEach(function (el) {
			console.log("element: " + el);
			el.insertAdjacentHTML(
				"afterend",
				"<div class='alert alert-danger small liveValidateMessage'></div>"
			);
		});
	}
}
