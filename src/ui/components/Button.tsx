import React from 'react';
import { ButtonProps } from '../../types';

export const Button: React.FC<ButtonProps> = ({
                                                  variant = 'primary',
                                                  size = 'md',
                                                  disabled = false,
                                                  loading = false,
                                                  onClick,
                                                  children,
                                                  className = '',
                                                  type = 'button'
                                              }) => {
    const baseClasses = 'mnemosyne-button';

    const variantClasses = {
        primary: 'mnemosyne-button-primary',
        secondary: 'mnemosyne-button-secondary',
        danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
        ghost: 'mnemosyne-button-ghost'
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) {
            event.preventDefault();
            return;
        }
        onClick?.(event);
    };

    return (
        <button
            type={type}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            onClick={handleClick}
            disabled={disabled || loading}
            aria-disabled={disabled || loading}
        >
            {loading ? (
                <div className="flex items-center gap-2">
                    <span className="mnemosyne-loading-spinner" aria-hidden="true" />
                    {children}
                </div>
            ) : (
                children
            )}
        </button>
    );
};