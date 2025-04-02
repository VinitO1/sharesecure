import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineLockClosed, HiOutlineShare } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
    const { user } = useAuth();

    return (
        <Container className="py-5">
            <Row className="mb-5 text-center">
                <Col>
                    <h1 className="display-4 fw-bold">ShareSecure</h1>
                    <p className="lead">
                        A secure platform for storing, sharing, and managing your documents
                    </p>
                    {!user ? (
                        <div className="mt-4">
                            <Link to="/login">
                                <Button variant="primary" size="lg" className="me-3">
                                    Login
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button variant="outline-primary" size="lg">
                                    Register
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <Link to="/dashboard">
                                <Button variant="primary" size="lg" className="me-3">
                                    Go to Dashboard
                                </Button>
                            </Link>
                            <Link to="/upload">
                                <Button variant="outline-primary" size="lg">
                                    Upload Document
                                </Button>
                            </Link>
                        </div>
                    )}
                </Col>
            </Row>

            <Row className="my-5">
                <Col md={4} className="mb-4">
                    <Card className="h-100 shadow-sm text-center p-4">
                        <Card.Body>
                            <div className="feature-icon mb-4">
                                <HiOutlineDocumentText size={50} className="text-primary" />
                            </div>
                            <Card.Title>Document Management</Card.Title>
                            <Card.Text>
                                Easily upload, organize, and access your important documents in one secure location.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} className="mb-4">
                    <Card className="h-100 shadow-sm text-center p-4">
                        <Card.Body>
                            <div className="feature-icon mb-4">
                                <HiOutlineLockClosed size={50} className="text-primary" />
                            </div>
                            <Card.Title>Secure Storage</Card.Title>
                            <Card.Text>
                                Your documents are encrypted and stored securely to protect your sensitive information.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} className="mb-4">
                    <Card className="h-100 shadow-sm text-center p-4">
                        <Card.Body>
                            <div className="feature-icon mb-4">
                                <HiOutlineShare size={50} className="text-primary" />
                            </div>
                            <Card.Title>Easy Sharing</Card.Title>
                            <Card.Text>
                                Share documents securely with others while maintaining control over access levels.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Home; 