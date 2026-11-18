import "server-only";
import { buttonMessage, contentMessage, send } from "./facebook";
import { dispatchForm, formMessages } from "./form";
import type { Settings } from "./types";

export async function sendForm(
  contactId: string,
  cfg: Settings,
  answers: Record<string, string>,
  key: string,
  expectedInbound: string,
) {
  await dispatchForm(formMessages(cfg, answers), (part) =>
    send(
      contactId,
      part.media_url
        ? contentMessage("", part.media_url, part.media_type)
        : buttonMessage(part.text, part.buttons),
      `${key}:${part.key}`,
      "standard",
      false,
      { expectedInbound },
    ),
  );
}
