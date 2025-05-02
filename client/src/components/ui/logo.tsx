import * as React from "react"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

const Logo = React.forwardRef<SVGSVGElement, LogoProps>(
  ({ size = 32, color = "var(--footbai-accent)", className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        <circle cx="16" cy="16" r="15" fill={color} />
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="black"
          fontSize="12"
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          FB
        </text>
      </svg>
    )
  }
)
Logo.displayName = "Logo"

export { Logo } 