import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setError('');
            setLoading(true);

            const { success, error } = await login(email, password);

            if (!success) {
                throw new Error(error);
            }

            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to login. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center">
            <Card className="shadow-sm" style={{ maxWidth: '450px', width: '100%' }}>
                <Card.Body className="p-4">
                    <h1 className="text-center mb-4">Log in to your account</h1>

                    {error && (
                        <Alert variant="danger">{error}</Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
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
                            placeholder="Enter your password"
                            required
                        />

                        <Button
                            type="submit"
                            block
                            isLoading={loading}
                            className="mt-4"
                        >
                            Log In
                        </Button>
                    </Form>

                    <div className="text-center mt-4">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/register" className="text-decoration-none">
                                Register
                            </Link>
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Login; 