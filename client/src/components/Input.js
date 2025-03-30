import React, { forwardRef } from 'react';
import { Form } from 'react-bootstrap';

const Input = forwardRef(({
    label,
    type = 'text',
    id,
    name,
    placeholder,
    error,
    className = '',
    ...props
}, ref) => {
    return (
        <Form.Group className="mb-3">
            {label && (
                <Form.Label htmlFor={id}>{label}</Form.Label>
            )}
            <Form.Control
                ref={ref}
                type={type}
                id={id}
                name={name}
                placeholder={placeholder}
                isInvalid={!!error}
                className={className}
                {...props}
            />
            {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
        </Form.Group>
    );
});

export default Input; 