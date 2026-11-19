import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export const BrandMark: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-8 h-8',
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nexTechTopGrad" x1="6.5" y1="6" x2="25.5" y2="16.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="nexTechRightGrad" x1="17" y1="17" x2="25.5" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill="#0f172a" />
      <path
        d="M16 5.8L25.2 11.1L16 16.4L6.8 11.1L16 5.8Z"
        fill="url(#nexTechTopGrad)"
      />
      <path
        d="M6.8 12.6L15.2 17.4V26L6.8 21.2V12.6Z"
        fill="#1e293b"
      />
      <path
        d="M16.8 17.4L25.2 12.6V21.2L16.8 26V17.4Z"
        fill="url(#nexTechRightGrad)"
      />
      <circle cx="16" cy="16.4" r="1.4" fill="#ffffff" opacity="0.9" />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  className = '',
}) => {
  const sizeConfig = {
    sm: {
      mark: 'w-7 h-7',
      title: 'text-sm',
      sub: 'text-[10px]',
    },
    md: {
      mark: 'w-8 h-8',
      title: 'text-base',
      sub: 'text-xs',
    },
    lg: {
      mark: 'w-10 h-10',
      title: 'text-lg',
      sub: 'text-xs',
    },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <BrandMark className={`${sizeConfig.mark} shrink-0 drop-shadow-xs`} />
      {showText && (
        <div className="leading-tight">
          <div className={`font-bold tracking-tight text-slate-900 ${sizeConfig.title}`}>
            <span>Nex</span>
            <span className="text-indigo-600">Tech</span>
          </div>
          {showSubtitle && (
            <p className={`font-medium text-slate-500 tracking-normal ${sizeConfig.sub}`}>
              Inventory & Orders
            </p>
          )}
        </div>
      )}
    </div>
  );
};

