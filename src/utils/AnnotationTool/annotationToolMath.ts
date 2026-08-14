/** Pure helpers for {@link AnnotationTool}. */

export type InsertionAction = "finish" | "cancel" | "none";

/** Map a mouse button to the insertion action: left finishes, right cancels. */
export function resolveInsertionAction(button: number, leftButton: number, rightButton: number): InsertionAction {
	if (button === leftButton) {
		return "finish";
	}
	if (button === rightButton) {
		return "cancel";
	}
	return "none";
}
