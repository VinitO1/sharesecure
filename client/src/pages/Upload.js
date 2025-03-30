import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Alert, Container, Row, Col } from 'react-bootstrap';
import { HiOutlineCloudUpload } from 'react-icons/hi';
import { documentService } from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';

const Upload = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            setFile(droppedFile);
            setFileName(droppedFile.name);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title) {
            setError('Please enter a document title');
            return;
        }

        if (!file) {
            setError('Please select a file to upload');
            return;
        }

        try {
            setError('');
            setLoading(true);

            // Validate file size
            if (file.size > 10 * 1024 * 1024) {
                setError('File size exceeds 10MB limit');
                return;
            }

            // Create form data
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description || '');
            formData.append('file', file);

            // Log the form data for debugging
            console.log("Title:", title);
            console.log("Description:", description);
            console.log("File:", file.name, "Size:", Math.round(file.size / 1024), "KB");

            const response = await documentService.uploadDocument(formData);
            console.log("Upload response:", response.data);

            if (response.data && response.data.document && response.data.document.id) {
                navigate(`/documents/${response.data.document.id}`);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            console.error('Upload error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Error uploading document. Please try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <Row className="justify-content-center">
                <Col md={8}>
                    <h1 className="mb-4">Upload New Document</h1>

                    {error && (
                        <Alert variant="danger">{error}</Alert>
                    )}

                    <Card className="shadow-sm">
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                <Input
                                    label="Document Title"
                                    type="text"
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter document title"
                                    required
                                />

                                <Form.Group className="mb-3">
                                    <Form.Label>Description (Optional)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Enter document description"
                                        rows="3"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label>Document File</Form.Label>
                                    <div
                                        className={`border border-2 rounded p-4 text-center ${dragActive ? 'border-primary bg-light' : 'border-secondary'
                                            }`}
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        <Form.Control
                                            type="file"
                                            id="file"
                                            onChange={handleFileChange}
                                            className="d-none"
                                        />

                                        <HiOutlineCloudUpload className="mx-auto mb-2" size={40} />

                                        <p className="mb-2">
                                            {fileName ? (
                                                <span className="fw-bold text-primary">{fileName}</span>
                                            ) : (
                                                <>
                                                    <span className="fw-bold">Click to upload</span> or drag and drop
                                                </>
                                            )}
                                        </p>

                                        <p className="text-muted small">
                                            PDF, Word, Excel, PowerPoint, and other files up to 10MB
                                        </p>

                                        <Button
                                            type="button"
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => document.getElementById('file').click()}
                                        >
                                            Select File
                                        </Button>
                                    </div>
                                </Form.Group>

                                <div className="d-flex justify-content-end gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => navigate('/')}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        isLoading={loading}
                                    >
                                        Upload Document
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Upload; 