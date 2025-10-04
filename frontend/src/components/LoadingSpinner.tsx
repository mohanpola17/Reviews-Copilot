import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'xl';
  message?: string;
  showMessage?: boolean;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'pulse';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message = 'Loading...', 
  showMessage = true,
  variant = 'default',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const variantClasses = {
    default: 'text-blue-600',
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };

  const iconSize = {
    small: 16,
    medium: 24,
    large: 32,
    xl: 48
  };

  return (
    <div className={`loading-spinner ${className}`}>
      <div className="loading-content">
        <div className="spinner-container">
          {variant === 'pulse' ? (
            <div className="pulse-spinner">
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
            </div>
          ) : (
            <Loader2 
              className={`animate-spin ${sizeClasses[size as keyof typeof sizeClasses]} ${variantClasses[variant as keyof typeof variantClasses]}`}
              size={iconSize[size as keyof typeof iconSize]}
            />
          )}
        </div>
        
        {showMessage && (
          <div className="loading-message">
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const LoadingOverlay = ({ 
  message = 'Loading...', 
  show = true,
  transparent = false 
}) => {
  if (!show) return null;

  return (
    <div className={`loading-overlay ${transparent ? 'transparent' : ''}`}>
      <div className="loading-overlay-content">
        <LoadingSpinner size="large" message={message} />
      </div>
    </div>
  );
};

interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  [key: string]: any;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  loading = false, 
  children, 
  disabled = false,
  onClick,
  className = '',
  variant = 'primary',
  size = 'medium',
  ...props 
}) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
    danger: 'btn-danger'
  };
  const sizeClasses = {
    small: 'btn-sm',
    medium: '',
    large: 'btn-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${loading ? 'loading' : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <RefreshCw size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export const SkeletonLoader = ({ 
  lines = 3, 
  height = '1rem',
  width = '100%',
  className = ''
}) => {
  return (
    <div className={`skeleton-loader ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="skeleton-line"
          style={{
            height,
            width: index === lines - 1 ? '75%' : width,
            marginBottom: index < lines - 1 ? '0.5rem' : '0'
          }}
        />
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="table-skeleton">
      <div className="skeleton-header">
        {Array.from({ length: columns }, (_, index) => (
          <div key={index} className="skeleton-cell" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="skeleton-row">
          {Array.from({ length: columns }, (_, colIndex) => (
            <div key={colIndex} className="skeleton-cell" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default LoadingSpinner;
