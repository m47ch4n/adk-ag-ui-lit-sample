import DOMPurify from "dompurify";
import { marked } from "marked";
import remend from "remend";

export function processMarkdown(text: string): string {
	if (!text) return "";

	// Step 1: Auto-complete incomplete Markdown using remend
	const completedText = remend(text);

	// Step 2: Convert Markdown to HTML using marked
	const html = marked.parse(completedText, { async: false }) as string;

	// Step 3: Sanitize HTML to prevent XSS
	const sanitizedHtml = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			"p",
			"br",
			"strong",
			"em",
			"code",
			"pre",
			"blockquote",
			"ul",
			"ol",
			"li",
			"a",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"table",
			"thead",
			"tbody",
			"tr",
			"th",
			"td",
			"hr",
			"del",
			"s",
			"sup",
			"sub",
		],
		ALLOWED_ATTR: ["href", "target", "rel", "class"],
	});

	return sanitizedHtml;
}
