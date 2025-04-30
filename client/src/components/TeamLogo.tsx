import { ManualLogoOptions, AILogoOptions } from "@/types";
import { CircleDot } from "lucide-react";

type TeamLogoProps = {
  logo?: ManualLogoOptions | AILogoOptions;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const TeamLogo = ({ logo, size = "md", className = "" }: TeamLogoProps) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
    xl: "w-24 h-24 text-4xl"
  };

  // Handle undefined or null logo
  if (!logo) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center bg-gray-200`}>
        <CircleDot className="w-1/2 h-1/2 opacity-70" />
      </div>
    );
  }

  // Handle AI-generated logo
  if ('image' in logo) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden`}>
        <img 
          src={logo.image} 
          alt="Team Logo" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Handle manual logo
  const hasInitials = logo.initials?.trim().length > 0;

  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center font-bold`}
      style={{ backgroundColor: logo.backgroundColor || "#62df6e" }}
    >
      {hasInitials ? (
        logo.initials
      ) : (
        <CircleDot className="w-1/2 h-1/2 opacity-70" />
      )}
    </div>
  );
};

export default TeamLogo;