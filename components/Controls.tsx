
import React, { useEffect, useState } from 'react';

interface ControlGroupProps {
  title: string;
  children: React.ReactNode;
}

export const ControlGroup: React.FC<ControlGroupProps> = ({ title, children }) => (
  <div className="mb-4">
    <h2 className="text-xs uppercase text-white font-bold border-l-4 border-primary pl-2 mb-3 tracking-widest flex items-center justify-between">
      {title}
    </h2>
    <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#333] space-y-4 shadow-inner">
      {children}
    </div>
  </div>
);

interface RangeProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const RangeControl: React.FC<RangeProps> = ({ label, className, value, onChange, min, max, step, ...props }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    if (onChange) onChange(e);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-[10px] uppercase text-gray-400 tracking-wider font-medium">{label}</label>
        <div className="bg-[#111] px-2 py-0.5 rounded border border-[#444] text-[10px] text-accent font-mono min-w-[40px] text-center">
          {localVal}
        </div>
      </div>
      <input
        type="range"
        className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-primary hover:accent-red-500 transition-all"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        step={step}
        {...props}
      />
    </div>
  );
};

export const ColorControl: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[9px] uppercase text-gray-500 tracking-wider">{label}</label>
        <div className="flex items-center gap-2 bg-[#111] p-1 rounded border border-[#333]">
            <input 
                type="color" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-6 h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden"
            />
            <input 
                type="text" 
                value={value.toUpperCase()} 
                onChange={(e) => onChange(e.target.value)}
                className="bg-transparent text-[10px] text-gray-300 font-mono w-full focus:outline-none"
            />
        </div>
    </div>
);

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const CheckboxControl: React.FC<CheckboxProps> = ({ label, className, ...props }) => (
  <label className={`flex items-center gap-2 cursor-pointer group ${className}`}>
    <div className="relative flex items-center justify-center">
        <input type="checkbox" className="peer w-4 h-4 opacity-0 absolute cursor-pointer" {...props} />
        <div className="w-4 h-4 border border-[#555] rounded bg-[#111] peer-checked:bg-primary peer-checked:border-primary transition-all"></div>
        <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
    </div>
    <span className="text-[11px] text-gray-400 group-hover:text-gray-200 select-none transition-colors">{label}</span>
  </label>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ variant = 'secondary', className, children, ...props }) => {
  const base = "px-4 py-2 rounded text-[11px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest";
  const styles = {
    primary: "bg-primary text-white hover:bg-red-700 shadow-lg shadow-red-900/20 active:scale-95",
    secondary: "bg-[#2a2a2a] border border-[#444] text-gray-300 hover:border-gray-100 hover:text-white active:bg-[#333]",
    danger: "bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white"
  };
  
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-[10px] uppercase text-gray-500 mb-1.5 tracking-wider font-medium">{label}</label>}
    <input 
      type="text" 
      className={`w-full bg-[#111] border border-[#333] text-white text-xs rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none transition-all ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className, children, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-[10px] uppercase text-gray-500 mb-1.5 tracking-wider font-medium">{label}</label>}
    <select 
      className={`w-full bg-[#111] border border-[#333] text-white text-xs rounded-md px-3 py-2 focus:border-primary focus:outline-none transition-all cursor-pointer appearance-none ${className}`}
      {...props}
    >
      {children}
    </select>
  </div>
);
