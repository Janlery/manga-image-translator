import React, { useState } from "react";
import { Icon } from "@iconify/react";

type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span>{title}</span>
        <Icon
          icon={isOpen ? "carbon:chevron-up" : "carbon:chevron-down"}
          className="text-gray-400"
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};
