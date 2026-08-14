/** Pure helpers for {@link Message}. */

/** Build the URL of the close icon from a resource base path. */
export function closeIconPath(resourcePath: string): string {
	return `${resourcePath}/icons/close.svg`;
}
