import React from 'react';
import { ComponentProps } from '../../types';

export interface CardProps extends ComponentProps {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    clickable?: boolean;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
                                              children,
                                              className = '',
                                              padding = 'md',
                                              hover = false,
                                              clickable = false,
                                              onClick
                                          }) => {
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };

    const hoverClass = hover || clickable ? 'hover:bg-ob-background-secondary transition-colors duration-200' : '';
    const cursorClass = clickable ? 'cursor-pointer' : '';

    const handleClick = () => {
        if (clickable && onClick) {
            onClick();
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (clickable && onClick && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onClick();
        }
    };

    return (
        <div
            className={`mnemosyne-card ${paddingClasses[padding]} ${hoverClass} ${cursorClass} ${className}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
        >
            {children}
        </div>
    );
};