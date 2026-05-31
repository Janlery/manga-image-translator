import React from "react";

type LabeledToggleProps = {
  id: string;
  label: string;
  title?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const LabeledToggle: React.FC<LabeledToggleProps> = ({
  id,
  label,
  title,
  checked,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-sm text-gray-700 font-medium" title={title}>
        {label}
      </label>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-blue-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
};
