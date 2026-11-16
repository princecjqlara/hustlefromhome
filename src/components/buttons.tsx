"use client";
import { Plus, Trash2 } from "lucide-react";
export type MessageButton = { title: string; url: string };
export default function ButtonEditor({
  value = [],
  onChange,
}: {
  value?: MessageButton[];
  onChange: (buttons: MessageButton[]) => void;
}) {
  return (
    <div className="button-editor">
      <div className="card-top">
        <span className="muted">Link buttons · clicks are tracked</span>
        <button
          type="button"
          className="text-link"
          disabled={value.length >= 3}
          onClick={() => onChange([...value, { title: "", url: "" }])}
        >
          <Plus size={12} />
          Add button
        </button>
      </div>
      {value.map((b, i) => (
        <div className="form-row" key={i}>
          <input
            aria-label="Button title"
            maxLength={20}
            placeholder="Button label"
            value={b.title}
            onChange={(e) =>
              onChange(
                value.map((x, j) =>
                  j === i ? { ...x, title: e.target.value } : x,
                ),
              )
            }
          />
          <input
            aria-label="Button URL"
            type="url"
            placeholder="https://…"
            value={b.url}
            onChange={(e) =>
              onChange(
                value.map((x, j) =>
                  j === i ? { ...x, url: e.target.value } : x,
                ),
              )
            }
          />
          <button
            type="button"
            className="icon-btn danger"
            aria-label="Remove button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
