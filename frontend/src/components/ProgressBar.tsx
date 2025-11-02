interface ProgressBarProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

export function ProgressBar({ 
  current, 
  total, 
  showPercentage = true,
  size = 'md',
  color = 'primary'
}: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };
  
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };
  
  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="mt-1 text-sm text-gray-600">
          {clampedPercentage.toFixed(1)}% funded
        </div>
      )}
    </div>
  );
}
