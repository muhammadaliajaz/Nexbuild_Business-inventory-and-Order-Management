import React from 'react';
import { Menu } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  title: string;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ title, onToggleMobileMenu }) => {
  return (
    <header className="lg:hidden h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="text-sm font-semibold text-slate-900">
          {title}
        </span>
      </div>

      <BrandLogo size="sm" showSubtitle={false} />
    </header>
  );
};
