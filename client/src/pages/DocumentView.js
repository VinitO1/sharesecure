import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineDownload, HiOutlineUser, HiOutlineTrash, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineShare, HiOutlineLockClosed, HiOutlineUsers, HiOutlineX } from 'react-icons/hi';
import { documentService } from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import { Container, Row, Col, Card, Modal, Alert } from 'react-bootstrap';
import FilePreview from '../components/FilePreview';
import DocumentThumbnail from '../components/DocumentThumbnail';

const DocumentView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    const [shareAccess, setShareAccess] = useState('read'); // Default to read-only
    const [sharing, setSharing] = useState(false);
    const [shareError, setShareError] = useState('');
    const [shareSuccess, setShareSuccess] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);

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
            setDownloadLoading(true);
            const response = await documentService.getDownloadUrl(id);
            window.open(response.data.downloadUrl, '_blank');
        } catch (err) {
            console.error('Download error:', err);
            alert('Error downloading file. Please try again.');
        } finally {
            setDownloadLoading(false);
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
            setShareSuccess(false);

            // Server always sets access to 'read' regardless of the value we send
            await documentService.shareDocument(id, shareEmail, 'read');

            setShareSuccess(true);
            setShareEmail('');

            // Clear success message after 5 seconds
            setTimeout(() => {
                setShareSuccess(false);
            }, 5000);
        } catch (error) {
            console.error('Share error:', error);
            setShareError(error?.response?.data?.error || 'Failed to share document. Please try again.');
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

    const getFileTypeIcon = (fileName) => {
        if (!fileName) return <HiOutlineDocumentText className="text-secondary" size={40} />;

        const extension = fileName.split('.').pop().toLowerCase();

        switch (extension) {
            case 'pdf':
                return <HiOutlineDocumentText className="text-danger" size={40} />;
            case 'doc':
            case 'docx':
                return <HiOutlineDocumentText className="text-primary" size={40} />;
            case 'xls':
            case 'xlsx':
                return <HiOutlineDocumentText className="text-success" size={40} />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return <HiOutlineDocumentText className="text-warning" size={40} />;
            default:
                return <HiOutlineDocumentText className="text-secondary" size={40} />;
        }
    };

    return (
        <Container className="py-4">
            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Loading document...</p>
                </div>
            ) : error ? (
                <div className="text-center py-5">
                    <div className="alert alert-danger">
                        <h4>Error Loading Document</h4>
                        <p>{error}</p>
                        <button
                            className="btn btn-outline-primary mt-3"
                            onClick={() => window.history.back()}
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            ) : !document || !document.id ? (
                <div className="text-center py-5">
                    <div className="alert alert-warning">
                        <h4>Document Not Found</h4>
                        <p>The document you are looking for could not be found or you don't have permission to view it.</p>
                        <button
                            className="btn btn-outline-primary mt-3"
                            onClick={() => window.history.back()}
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            ) : (
                <>
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
                        <Card className="shadow-sm mt-4">
                            <Card.Body className="p-4">
                                <div className="d-flex align-items-center mb-3">
                                    <HiOutlineShare className="me-2 text-primary" size={24} />
                                    <h2 className="h4 mb-0">Share Document</h2>
                                </div>

                                <div className="sharing-info bg-light p-3 rounded mb-4">
                                    <p className="mb-2">
                                        Share this document with others by entering their email address below.
                                    </p>
                                    <div className="d-flex align-items-center">
                                        <span className="badge bg-info me-2">
                                            <HiOutlineLockClosed className="me-1" />
                                            Read-only
                                        </span>
                                        <span className="text-muted small">Recipients can view and download, but cannot edit the document</span>
                                    </div>
                                </div>

                                {shareSuccess && (
                                    <Alert variant="success" className="mb-3 d-flex align-items-center">
                                        <HiOutlineCheckCircle className="me-2 flex-shrink-0" size={20} />
                                        <div>Document shared successfully!</div>
                                    </Alert>
                                )}

                                {shareError && (
                                    <Alert variant="danger" className="mb-3 d-flex align-items-center">
                                        <HiOutlineExclamation className="me-2 flex-shrink-0" size={20} />
                                        <div>{shareError}</div>
                                    </Alert>
                                )}

                                <form onSubmit={handleShare}>
                                    <div className="row g-3 align-items-center">
                                        <div className="col-md-8">
                                            <div className="form-floating">
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    id="shareEmail"
                                                    placeholder="name@example.com"
                                                    value={shareEmail}
                                                    onChange={(e) => setShareEmail(e.target.value)}
                                                    required
                                                />
                                                <label htmlFor="shareEmail">Recipient's email address</label>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <Button
                                                type="submit"
                                                className="w-100 btn-lg d-flex align-items-center justify-content-center"
                                                disabled={sharing}
                                            >
                                                {sharing ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Sharing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <HiOutlineShare className="me-2" /> Share Document
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </Card.Body>
                        </Card>
                    )}

                    {document.access_level === 'owner' && document.shared_with && document.shared_with.length > 0 && (
                        <Card className="shadow-sm mt-4">
                            <Card.Body className="p-4">
                                <div className="d-flex align-items-center mb-3">
                                    <HiOutlineUsers className="me-2 text-primary" size={24} />
                                    <h2 className="h4 mb-0">People with Access</h2>
                                </div>

                                <p className="text-muted mb-3">
                                    These people have access to view and download this document.
                                </p>

                                <div className="list-group">
                                    {document.shared_with.map((user) => (
                                        <div
                                            key={user.id}
                                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3"
                                        >
                                            <div className="d-flex align-items-center">
                                                <div className="avatar-circle me-3 d-flex align-items-center justify-content-center">
                                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h6 className="mb-0">{user.full_name || user.email}</h6>
                                                    <div className="d-flex align-items-center">
                                                        <span className="badge bg-info me-2">
                                                            <HiOutlineLockClosed className="me-1" size={10} />
                                                            Read-only
                                                        </span>
                                                        <span className="text-muted small">{user.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleRemoveAccess(user.id)}
                                                className="d-flex align-items-center"
                                            >
                                                <HiOutlineX className="me-1" /> Remove
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
                </>
            )}
        </Container>
    );
};

export default DocumentView; 