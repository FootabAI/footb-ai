import { X } from "lucide-react";
import React from "react";

interface TagProps {
  tag: string;
  removeTag: (tagToRemove: string) => void;
}

const Tag = ({ tag, removeTag }: TagProps) => (
  <div className="flex items-center gap-1 bg-footbai-accent/20 px-2 py-1 rounded-md text-sm">
    <span>{tag}</span>
    <button
      onClick={() => removeTag(tag)}
      className="hover:text-footbai-accent"
    >
      <X size={14} />
    </button>
  </div>
);

export default Tag;
