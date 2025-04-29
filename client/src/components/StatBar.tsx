import React from 'react';

type StatBarProps = {
  value: number;
  maxValue?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
};

const StatBar: React.FC<StatBarProps> = ({
  value,
  maxValue = 100,
  color = "#62df6e",
  label,
  showValue = true,
}) => {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1 text-sm">
          <span>{label}</span>
          {showValue && <span>{value}</span>}
        </div>
      )}
      <div className="stat-bar">
        <div
          className="stat-value"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

export default StatBar;