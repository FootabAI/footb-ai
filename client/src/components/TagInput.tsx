import React, { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Tag from "./ui/tag";


interface TagInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}
const TagInput = ({
  tags,
  onTagsChange,
  placeholder = "Add tags...",
  maxTags = 10,
  className,
  ...props
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add tag on Enter or comma press
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag) && tags.length < maxTags) {
        onTagsChange([...tags, newTag]);
        setInputValue("");
      }
    }

    // Remove last tag on Backspace if input is empty
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };
  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={tags.length >= maxTags}
        className="flex items-center bg-footbai-header rounded-md px-3 py-2 focus-within:ring-1 focus-within:ring-footbai-accent"
        {...props}
      />

      <div className="flex flex-wrap gap-2 pt-1 bg-color-black h-8">
        {tags.map((tag) => (
          <Tag key={tag} tag={tag} removeTag={removeTag} />
        ))}
      </div>
    </div>
  );
};
export default TagInput;
