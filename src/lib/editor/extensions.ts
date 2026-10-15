import { Node, mergeAttributes, type Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';

/** A pass-through HTML attribute (kept as written when the article is loaded and saved). */
const keep = (name: string) => ({
	default: null,
	parseHTML: (element: HTMLElement) => element.getAttribute(name),
	renderHTML: (attributes: Record<string, unknown>) =>
		attributes[name] ? { [name]: attributes[name] } : {}
});

/** Legacy CKEditor images often carry inline sizes (`style="width:100%"`): keep them. */
const ArticleImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			style: keep('style'),
			width: keep('width'),
			height: keep('height')
		};
	}
}).configure({ allowBase64: false });

/**
 * `<video>` blocks (a few legacy articles embed uploaded videos). Tiptap has no video node, so
 * without this they would disappear the first time such an article is saved.
 */
const Video = Node.create({
	name: 'video',
	group: 'block',
	atom: true,
	draggable: true,
	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (element) =>
					element.getAttribute('src') ?? element.querySelector('source')?.getAttribute('src')
			},
			poster: keep('poster'),
			width: keep('width'),
			height: keep('height'),
			style: keep('style')
		};
	},
	parseHTML() {
		return [{ tag: 'video' }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			'video',
			mergeAttributes(HTMLAttributes, { controls: 'controls', preload: 'metadata' })
		];
	}
});

/** Everything the legacy toolbar offered (except font family), plus tables and videos. */
export function articleExtensions(): Extensions {
	return [
		StarterKit.configure({
			heading: { levels: [2, 3, 4] },
			code: false,
			codeBlock: false,
			link: {
				openOnClick: false,
				autolink: true,
				defaultProtocol: 'https',
				protocols: ['http', 'https', 'mailto'],
				HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
			}
		}),
		TextStyleKit.configure({ fontFamily: false, lineHeight: false }),
		TextAlign.configure({ types: ['heading', 'paragraph'] }),
		TableKit.configure({ table: { resizable: false } }),
		ArticleImage,
		Video
	];
}
