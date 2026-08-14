import { closeIconPath } from "./messageUtils";

type MessageContent = string | JQuery | HTMLElement;

export class Message {

	content: MessageContent;
	element: JQuery;
	elClose: JQuery;
	elContainer: JQuery;

	constructor (content: MessageContent) {
		this.content = content;

		// `exports.resourcePath` was a pre-Vite bundle global; use the runtime
		// `Potree.resourcePath` export instead (same value).
		const closeIcon = closeIconPath(Potree.resourcePath);

		this.element = $(`
			<div class="potree_message">
				<span name="content_container" style="flex-grow: 1; padding: 5px"></span>
				<img name="close" src="${closeIcon}" class="button-icon" style="width: 16px; height: 16px;">
			</div>`);

		this.elClose = this.element.find("img[name=close]");

		this.elContainer = this.element.find("span[name=content_container]");

		this.appendContent(content);
	}

	setMessage (content: MessageContent) {
		this.elContainer.empty();
		this.appendContent(content);
	}

	private appendContent (content: MessageContent) {
		if (typeof content === "string") {
			this.elContainer.append($(`<span>${content}</span>`));
		} else {
			this.elContainer.append(content);
		}
	}

}
