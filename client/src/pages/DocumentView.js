import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineDownload, HiOutlineUser, HiOutlineTrash } from 'react-icons/hi';
import { documentService } from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import DocumentThumbnail from '../components/DocumentThumbnail';
import { Container, Row, Col, Card, Modal } from 'react-bootstrap';
import FilePreview from '../components/FilePreview';

const DocumentView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    const [shareAccess, setShareAccess] = useState('read');
    const [sharing, setSharing] = useState(false);
    const [shareError, setShareError] = useState('');
    const [shareSuccess, setShareSuccess] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                setLoading(true);
                const response = await documentService.getDocument(id);
                setDocument(response.data);
            } catch (err) {
                setError('Error fetching document. It may have been deleted or you may not have access.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDocument();
    }, [id]);

    const handleDownload = async () => {
        try {
            const response = await documentService.getDownloadUrl(id);
            window.open(response.data.downloadUrl, '_blank');
        } catch (err) {
            console.error('Download error:', err);
            alert('Error downloading file. Please try again.');
        }
    };

    const handleShare = async (e) => {
        e.preventDefault();

        if (!shareEmail) {
            setShareError('Please enter an email address');
            return;
        }

        try {
            setSharing(true);
            setShareError('');
            setShareSuccess('');

            await documentService.shareDocument(id, shareEmail, shareAccess);

            setShareSuccess(`Document shared successfully with ${shareEmail}`);
            setShareEmail('');
        } catch (err) {
            console.error('Share error:', err);
            setShareError(err.response?.data?.error || 'Error sharing document. Please try again.');
        } finally {
            setSharing(false);
        }
    };

    const handleRemoveAccess = async (userId) => {
        if (window.confirm('Are you sure you want to remove access for this user?')) {
            try {
                await documentService.removeAccess(id, userId);

                // Refresh document data
                const response = await documentService.getDocument(id);
                setDocument(response.data);
            } catch (err) {
                console.error('Remove access error:', err);
                alert('Error removing access. Please try again.');
            }
        }
    };

    const handleDeleteDocument = async () => {
        try {
            setDeleting(true);
            await documentService.deleteDocument(id);
            navigate('/', { state: { message: 'Document deleted successfully' } });
        } catch (err) {
            console.error('Delete error:', err);
            alert('Error deleting document. Please try again.');
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-5">
                <Card className="shadow-sm">
                    <Card.Body className="p-4">
                        <h2 className="text-danger mb-3">Error</h2>
                        <p className="mb-4">{error}</p>
                        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <Card className="shadow-sm mb-4">
                <Card.Body className="p-4">
                    <Row>
                        <Col md={3} className="mb-4 mb-md-0">
                            <DocumentThumbnail documentId={id} fileName={document.file_url} />
                        </Col>
                        <Col md={9}>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <h1 className="h3 mb-0">{document.title}</h1>
                                {document.access_level === 'owner' && (
                                    <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => setShowDeleteModal(true)}
                                        title="Delete Document"
                                    >
                                        <HiOutlineTrash className="me-1" />
                                        Delete
                                    </button>
                                )}
                            </div>
                            <p className="text-muted mb-3">{document.description}</p>
                            <div className="d-flex flex-wrap align-items-center mb-3 small text-muted">
                                <span>Uploaded by: {document.owner?.full_name || document.owner?.email || "Unknown user"}</span>
                                <span className="mx-2">•</span>
                                <span>
                                    {new Date(document.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </span>
                                {document.access_level && document.access_level !== 'owner' && (
                                    <>
                                        <span className="mx-2">•</span>
                                        <span className="badge bg-info">{document.access_level} access</span>
                                    </>
                                )}
                            </div>
                            <FilePreview documentId={id} fileName={document.file_url} />
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {document.access_level === 'owner' && (
                <Card className="shadow-sm mb-4">
                    <Card.Body className="p-4">
                        <h2 className="h4 mb-4">Share Document</h2>

                        {shareError && (
                            <div className="alert alert-danger mb-4">
                                {shareError}
                            </div>
                        )}

                        {shareSuccess && (
                            <div className="alert alert-success mb-4">
                                {shareSuccess}
                            </div>
                        )}

                        <form onSubmit={handleShare}>
                            <Row className="g-3 align-items-end">
                                <Col md={6}>
                                    <Input
                                        label="Email Address"
                                        type="email"
                                        id="shareEmail"
                                        value={shareEmail}
                                        onChange={(e) => setShareEmail(e.target.value)}
                                        placeholder="Enter recipient's email"
                                    />
                                </Col>
                                <Col md={3}>
                                    <label htmlFor="accessLevel" className="form-label">
                                        Access Level
                                    </label>
                                    <select
                                        id="accessLevel"
                                        value={shareAccess}
                                        onChange={(e) => setShareAccess(e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="read">Read Only</option>
                                        <option value="edit">Can Edit</option>
                                    </select>
                                </Col>
                                <Col md={3}>
                                    <Button type="submit" isLoading={sharing} className="w-100">
                                        Share
                                    </Button>
                                </Col>
                            </Row>
                        </form>
                    </Card.Body>
                </Card>
            )}

            {document.access_level === 'owner' && document.shared_with && document.shared_with.length > 0 && (
                <Card className="shadow-sm">
                    <Card.Body className="p-4">
                        <h2 className="h4 mb-4">Shared With</h2>
                        <div className="d-flex flex-column gap-3">
                            {document.shared_with.map((user) => (
                                <div
                                    key={user.id}
                                    className="d-flex justify-content-between align-items-center p-3 border rounded"
                                >
                                    <div className="d-flex align-items-center">
                                        <div className="bg-light p-2 rounded-circle me-3">
                                            <HiOutlineUser className="text-secondary" size={20} />
                                        </div>
                                        <div>
                                            <p className="mb-0 fw-medium">{user.full_name || user.email}</p>
                                            <p className="mb-0 small text-muted text-capitalize">{user.access_level} access</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleRemoveAccess(user.id)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Delete Document</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to delete "{document?.title}"?</p>
                    <p className="text-danger mb-0">This action cannot be undone.</p>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowDeleteModal(false)}
                        disabled={deleting}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={handleDeleteDocument}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting...' : 'Delete Document'}
                    </button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DocumentView; 