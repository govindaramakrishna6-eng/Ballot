import { byteLength } from "./bytes";
import {
  DEADLINE_SAFETY_SEC,
  MAX_DESCRIPTION_BYTES,
  MAX_DURATION_SEC,
  MAX_OPTION_BYTES,
  MAX_OPTIONS,
  MAX_TITLE_BYTES,
  MIN_DURATION_SEC,
  MIN_OPTIONS,
} from "./limits";

export type PollDraft = { title: string; description: string; options: string[]; endTimeSec: number | null };

export type DraftCheck = {
  valid: boolean;
  /** Trimmed values — exactly what will be sent on-chain. */
  clean: { title: string; description: string; options: string[] };
  errors: { title?: string; description?: string; options: (string | undefined)[]; optionCount?: string; endTime?: string };
  /** Allowed but worth a second look, e.g. "Yes" and "yes". */
  warnings: (string | undefined)[];
};

/** Mirrors every createPoll rule so users see problems before paying gas. `nowSec` is chain time. */
export function checkDraft(draft: PollDraft, nowSec: number): DraftCheck {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const options = draft.options.map((o) => o.trim());
  const errors: DraftCheck["errors"] = { options: options.map(() => undefined) };
  const warnings: DraftCheck["warnings"] = options.map(() => undefined);

  if (title.length === 0) errors.title = "Add a title.";
  else if (byteLength(title) > MAX_TITLE_BYTES) errors.title = `Title is over ${MAX_TITLE_BYTES} bytes.`;

  if (byteLength(description) > MAX_DESCRIPTION_BYTES) {
    errors.description = `Description is over ${MAX_DESCRIPTION_BYTES} bytes.`;
  }

  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    errors.optionCount = `A poll needs ${MIN_OPTIONS}–${MAX_OPTIONS} options.`;
  }

  options.forEach((opt, i) => {
    if (opt.length === 0) {
      errors.options[i] = "Option is empty.";
      return;
    }
    if (byteLength(opt) > MAX_OPTION_BYTES) {
      errors.options[i] = `Option is over ${MAX_OPTION_BYTES} bytes.`;
      return;
    }
    // Only compare with earlier rows so the first occurrence stays valid and the copy is flagged.
    const exact = options.findIndex((other, j) => j < i && other === opt);
    if (exact !== -1) {
      errors.options[i] = `Same as option ${exact + 1}.`;
      return;
    }
    const near = options.findIndex((other, j) => j < i && other.toLowerCase() === opt.toLowerCase());
    if (near !== -1) warnings[i] = `Looks like option ${near + 1} (different capitalisation). Allowed, but check it.`;
  });

  if (draft.endTimeSec === null || Number.isNaN(draft.endTimeSec)) {
    errors.endTime = "Pick a deadline.";
  } else {
    const ahead = draft.endTimeSec - nowSec;
    if (ahead < MIN_DURATION_SEC + DEADLINE_SAFETY_SEC) errors.endTime = "Deadline must be at least 6 minutes from now.";
    else if (ahead > MAX_DURATION_SEC - DEADLINE_SAFETY_SEC) errors.endTime = "Deadline must be within 30 days.";
  }

  const valid =
    !errors.title &&
    !errors.description &&
    !errors.optionCount &&
    !errors.endTime &&
    errors.options.every((e) => e === undefined);

  return { valid, clean: { title, description, options }, errors, warnings };
}
