import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

const Register = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!fullName || !email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password should be at least 6 characters');
            return;
        }

        try {
            setError('');
            setLoading(true);

            console.log('Attempting registration with email:', email);

            const { success, error, data, message } = await register(email, password, fullName);

            if (!success) {
                console.error('Registration failed:', error);
                throw new Error(error);
            }

            console.log('Registration successful, user:', data?.user?.id);

            // If this was an auto-login (user already existed), go to dashboard
            if (message && message.includes('already registered')) {
                console.log('User was already registered and logged in');
                // Force a slight delay to ensure auth context is updated
                setTimeout(() => {
                    navigate('/dashboard');
                }, 100);
            } else {
                // New registration - go to dashboard
                console.log('New user registered successfully');
                // Force a slight delay to ensure auth context is updated
                setTimeout(() => {
                    navigate('/dashboard');
                }, 100);
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Failed to register. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center">
            <Card className="shadow-sm" style={{ maxWidth: '450px', width: '100%' }}>
                <Card.Body className="p-4">
                    <h1 className="text-center mb-4">Create a new account</h1>

                    {error && (
                        <Alert variant="danger">{error}</Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
                        <Input
                            label="Full Name"
                            type="text"
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            required
                        />

                        <Input
                            label="Email"
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            required
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            required
                        />

                        <Button
                            type="submit"
                            block
                            isLoading={loading}
                            className="mt-4"
                        >
                            Register
                        </Button>
                    </Form>

                    <div className="text-center mt-4">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login" className="text-decoration-none">
                                Log in
                            </Link>
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Register; 