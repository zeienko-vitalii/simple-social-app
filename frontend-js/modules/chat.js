import DOMPurify from "dompurify";

export default class Chat {
	constructor() {
		this.openedYet = false;
		this.chatWrapper = document.querySelector("#chat-wrapper");
		this.openIcon = document.querySelector(".header-chat-icon");
		this.injectHTML();
		// it doesn't exist yet, so we need to add it to the DOM
		this.chatLog = document.querySelector("#chat");
		this.chatField = document.querySelector("#chatField");
		this.chatForm = document.querySelector("#chatForm");
		this.closeIcon = document.querySelector(".chat-title-bar-close");
		this.events();
	}

	// Events
	events() {
		this.chatForm.addEventListener("submit", (e) => {
			e.preventDefault();
			this.sendMessageToServer();
		});
		this.openIcon.addEventListener("click", () => this.openCloseChat());
		this.closeIcon.addEventListener("click", () => this.openCloseChat());
	}

	// Methods
	sendMessageToServer() {
		let message = this.chatField.value;
		this.socket.emit("chatMessageFromBrowser", { message });

		this.showMyMessage(message);
		this.chatField.value = "";
		this.chatField.focus();
	}

	showMyMessage(message) {
		this.chatLog.insertAdjacentHTML(
			"beforeend",
			DOMPurify.sanitize(`<div class="chat-self">
            <div class="chat-message">
              <div class="chat-message-inner">
                ${message}
              </div>
            </div>
            <img class="chat-avatar avatar-tiny" src="${this.avatar}">
          </div>`)
		);
		this.chatLog.scrollTop = this.chatLog.scrollHeight;
	}

	openCloseChat() {
		if (!this.openedYet) {
			this.openConnection();
			this.openedYet = true;
		}

		this.chatWrapper.classList.toggle("chat--visible");

		const isVisible = this.chatWrapper.classList.contains("chat--visible");
		if (isVisible) {
			this.chatField.focus();
			console.log("focus");
		}
	}

	openConnection() {
		this.socket = io();
		this.socket.on("welcome", (data) => {
			this.username = data.username;
			this.avatar = data.avatar;
		});
		this.socket.on("chatMessageFromServer", (data) => {
			this.displayMessageFromServer(data);
		});
	}

	displayMessageFromServer(data) {
		this.chatLog.insertAdjacentHTML(
			"beforeend",
			DOMPurify.sanitize(`
            <div class="chat-other">
              <a href="/profile/${data.username}"><img class="avatar-tiny" src="${data.avatar}"></a>
              <div class="chat-message"><div class="chat-message-inner">
                <a href="/profile/${data.username}"><strong>${data.username}:</strong></a>
                ${data.message}
              </div></div>
            </div>
            `)
		);
		this.chatLog.scrollTop = this.chatLog.scrollHeight;
	}

	injectHTML() {
		this.chatWrapper.innerHTML = ` 
        <div class="chat-title-bar">Chat <span class="chat-title-bar-close"><i class="fas fa-times-circle"></i></span></div>
        <div id="chat" class="chat-log">

        </div>
        <form id="chatForm" class="chat-form border-top">
            <input type="text" class="chat-field" id="chatField" placeholder="Type a message…" autocomplete="off">
        </form>`;
	}
}
