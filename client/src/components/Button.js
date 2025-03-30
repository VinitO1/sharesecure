import React from 'react';
import { Button as BootstrapButton, Spinner } from 'react-bootstrap';

const Button = ({
    children,
    type = 'button',
    variant = 'primary',
    size,
    block = false,
    isLoading = false,
    disabled = false,
    className = '',
    ...props
}) => {
    return (
        <BootstrapButton
            type={type}
            variant={variant}
            size={size}
            disabled={disabled || isLoading}
            className={`${block ? 'w-100' : ''} ${className}`}
            {...props}
        >
            {isLoading && (
                <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                />
            )}
            {children}
        </BootstrapButton>
    );
};

export default Button; 