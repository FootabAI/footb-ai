import { CircleDot, Loader2 } from "lucide-react";
import { useState } from "react";

type TeamLogoProps = {
  logo: {
    type: 'manual' | 'ai';
    data: {
      initials?: string;
      backgroundColor?: string;
      image?: string;
      mainColor?: string;
    };
  };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const TeamLogo = ({ logo, size = "md", className = "" }: TeamLogoProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
    xl: "w-24 h-24 text-4xl"
  };

  if (!logo?.data) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center bg-footbai-container`}>
        <CircleDot className="w-1/2 h-1/2 opacity-70" />
      </div>
    );
  }

  if (logo.type === 'ai' && logo.data.image) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden relative border-white/50 border`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-1/2 h-1/2 animate-spin text-footbai-accent" />
          </div>
        )}
        <img 
          src={logo.data.image} 
          onLoad={() => setIsLoading(false)}
          alt="Team Logo" 
          className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>
    );
  }

  const hasInitials = logo.data.initials?.trim().length > 0;

  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center font-bold border-white/50 border`}
      style={{ backgroundColor: logo.data.backgroundColor || "#62df6e" }}
    >
      {hasInitials ? (
        logo.data.initials
      ) : (
        <CircleDot className="w-1/2 h-1/2 opacity-70" />
      )}
    </div>
  );
};

export default TeamLogo;