import React from "react";
import { Icon } from "@iconify/react";

type LabeledTextInputProps = {
  id: string;
  label: string;
  icon?: string;
  title?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

export const LabeledTextInput: React.FC<LabeledTextInputProps> = ({
  id,
  label,
  icon,
  title,
  placeholder,
  value,
  onChange,
}) => {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1 text-sm text-gray-700 font-medium">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <Icon
            icon={icon}
            className="absolute top-1/2 left-2 -translate-y-1/2 text-gray-400"
          />
        )}
        <input
          id={id}
          title={title}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none border border-gray-300 rounded ${
            icon ? "pl-8" : "pl-3"
          } pr-3 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none`}
        />
      </div>
    </div>
  );
};
