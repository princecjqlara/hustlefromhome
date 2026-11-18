"use client";
import { Plus, Trash2 } from "lucide-react";
import ButtonEditor from "./buttons";
import { defaultFormIntro, formMessages } from "@/lib/form";
import type { ProcessMessage, Settings } from "@/lib/types";

export default function FormEditor({
  cfg,
  update,
}: {
  cfg: Settings;
  update: (changes: Partial<Settings>) => void;
}) {
  const steps = cfg.process_messages || [];
  const edit = (id: string, changes: Partial<ProcessMessage>) =>
    update({
      process_messages: steps.map((step) =>
        step.id === id ? { ...step, ...changes } : step,
      ),
    });
  const move = (index: number, offset: number) => {
    const reordered = [...steps];
    [reordered[index], reordered[index + offset]] = [
      reordered[index + offset],
      reordered[index],
    ];
    update({ process_messages: reordered });
  };
  const preview = formMessages(cfg, {});
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>How to send your form</h3>
            <p>
              Contacts can answer several questions in one reply. Clear answers
              are saved, and only unanswered questions are sent again.
            </p>
          </div>
        </div>
        <div className="panel-body">
          <label className="field">
            <span>Question delivery</span>
            <select
              value={cfg.form_mode || "form"}
              onChange={(e) =>
                update({ form_mode: e.target.value as "form" | "single" })
              }
            >
              <option value="form">All unanswered questions in one form</option>
              <option value="single">One question at a time</option>
            </select>
          </label>
          <label className="field">
            <span>Form introduction</span>
            <textarea
              maxLength={2000}
              value={cfg.form_intro ?? defaultFormIntro}
              onChange={(e) => update({ form_intro: e.target.value })}
            />
          </label>
          <p className="muted">
            For example, a contact can reply “1. Maria Santos, 2.
            maria@example.com, 3. Cebu” in one message.
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Process messages sent with the form</h3>
            <p>
              After each form send, these messages arrive separately in this
              order. They repeat with the remaining form during follow-ups.
            </p>
          </div>
          <button
            type="button"
            className="btn small"
            disabled={steps.length >= 10}
            onClick={() =>
              update({
                process_messages: [
                  ...steps,
                  { id: crypto.randomUUID(), text: "" },
                ],
              })
            }
          >
            <Plus size={14} /> Add process message
          </button>
        </div>
        <div className="panel-body">
          {!steps.length && (
            <p className="muted">
              Add your application instructions, what happens next, a video, or
              a link. Up to 10 messages.
            </p>
          )}
          {steps.map((step, i) => (
            <div className="faq-card" key={step.id}>
              <div className="card-top">
                <span className="eyebrow">PROCESS MESSAGE {i + 1}</span>
                <div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Move process message ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Move process message ${i + 1} down`}
                    disabled={i === steps.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label={`Remove process message ${i + 1}`}
                    onClick={() =>
                      update({
                        process_messages: steps.filter((s) => s.id !== step.id),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <label className="field">
                <span>Message</span>
                <textarea
                  value={step.text}
                  maxLength={step.buttons?.length ? 640 : 2000}
                  placeholder="Step 1: Complete your details above. Step 2: Our team will review your answers…"
                  onChange={(e) => edit(step.id, { text: e.target.value })}
                />
                <small>
                  {step.buttons?.length
                    ? "With buttons: maximum 640 characters."
                    : "Maximum 2,000 characters. Media sends as a separate message after the text."}
                </small>
              </label>
              <ButtonEditor
                value={step.buttons}
                onChange={(buttons) => edit(step.id, { buttons })}
              />
              <div className="form-row">
                <label className="field">
                  <span>Media URL (optional)</span>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={step.media_url || ""}
                    onChange={(e) =>
                      edit(step.id, { media_url: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Media type</span>
                  <select
                    value={step.media_type || "image"}
                    onChange={(e) =>
                      edit(step.id, {
                        media_type: e.target
                          .value as ProcessMessage["media_type"],
                      })
                    }
                  >
                    {["image", "video", "audio", "file"].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Message preview</h3>
            <p>
              Each numbered block is a separate Messenger message. Nothing is
              sent from this preview.
            </p>
          </div>
        </div>
        <div className="panel-body">
          {!preview.length && (
            <p className="muted">
              Add questions below to preview your form and process messages.
            </p>
          )}
          {preview.map((part, i) => (
            <div className="faq-card" key={part.key}>
              <span className="eyebrow">MESSAGE {i + 1}</span>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {part.text ||
                  `${part.media_type || "image"}: ${part.media_url}`}
              </p>
              {!!part.buttons?.length && (
                <p className="muted">
                  Buttons:{" "}
                  {part.buttons.map((button) => button.title).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
