import React from 'react';

interface ControlGroupProps {
  title: string;
  children: React.ReactNode;
}

export const ControlGroup: React.FC<ControlGroupProps> = ({ title, children }) => (
  <div className="mb-4">
    <h2 className="text-xs uppercase text-white font-bold border-l-4 border-primary pl-2 mb-3 tracking-widest">
      {title}
    </h2>
    <div className="bg-[#262626] p-4 rounded border border-border space-y-3">
      {children}
    </div>
  </div>
);

interface RangeProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  valueDisplay?: string | number;
}

export const RangeControl: React.FC<RangeProps> = ({ label, valueDisplay, className, ...props }) => (
  <div className={className}>
    <div className="flex justify-between items-center mb-1">
      <label className="text-[10px] uppercase text-gray-400 tracking-wider">{label}</label>
      <span className="text-[10px] text-gray-500 font-mono">{valueDisplay}</span>
    </div>
    <input
      type="range"
      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
      {...props}
    />
  </div>
);

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const CheckboxControl: React.FC<CheckboxProps> = ({ label, className, ...props }) => (
  <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
    <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary accent-primary" {...props} />
    <span className="text-xs text-gray-300 select-none">{label}</span>
  </label>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }> = ({ variant = 'secondary', className, children, ...props }) => {
  const base = "px-4 py-2 rounded text-sm font-bold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = variant === 'primary' 
    ? "bg-primary text-white hover:bg-red-700 shadow-lg shadow-red-900/20" 
    : "bg-transparent border border-gray-600 text-gray-400 hover:border-white hover:text-white";
  
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-[10px] uppercase text-gray-400 mb-1 tracking-wider">{label}</label>}
    <input 
      type="text" 
      className={`w-full bg-[#151515] border border-gray-700 text-white text-sm rounded px-2 py-1.5 focus:border-primary focus:outline-none ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className, children, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-[10px] uppercase text-gray-400 mb-1 tracking-wider">{label}</label>}
    <select 
      className={`w-full bg-[#151515] border border-gray-700 text-white text-sm rounded px-2 py-1.5 focus:border-primary focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  </div>
);
