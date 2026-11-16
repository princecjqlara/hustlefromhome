"use client";
import { Plus, Trash2 } from "lucide-react";
export default function ContactFields({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  const entries = Object.entries(value);
  return (
    <div className="field">
      <span>Additional details</span>
      {entries.map(([key, text], i) => (
        <div className="form-row custom-field" key={i}>
          <input
            aria-label="Field name"
            placeholder="e.g. City"
            value={key}
            onChange={(e) => {
              const next = [...entries];
              next[i] = [e.target.value, text];
              onChange(Object.fromEntries(next));
            }}
          />
          <input
            aria-label="Field value"
            placeholder="e.g. Manila"
            value={text}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
          <button
            className="icon-btn danger"
            type="button"
            aria-label="Remove detail"
            onClick={() =>
              onChange(Object.fromEntries(entries.filter((_, j) => i !== j)))
            }
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-link"
        onClick={() => {
          let i = 1;
          while ("Detail " + i in value) i++;
          onChange({ ...value, ["Detail " + i]: "" });
        }}
      >
        <Plus size={13} />
        Add a detail
      </button>
    </div>
  );
}
