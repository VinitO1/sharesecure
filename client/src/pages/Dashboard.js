import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Badge, Tab, Tabs, Container, Button as BsButton, Modal, Alert } from 'react-bootstrap';
import {
    HiOutlineDocumentText,
    HiOutlineDownload,
    HiOutlineShare,
    HiOutlineEye,
    HiOutlineUpload,
    HiOutlineClock,
    HiOutlineInformationCircle,
    HiOutlineTrash,
    HiOutlineRefresh
} from 'react-icons/hi';
import { documentService } from '../services/api';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import FilePreview from '../components/FilePreview';
import DocumentThumbnail from '../components/DocumentThumbnail';

const Dashboard = () => {
    const [documents, setDocuments] = useState({ owned: [], shared: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('owned');
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    useEffect(() => {
        console.log('Dashboard component mounted');

        // Log authentication status
        console.log('Auth state on Dashboard mount:', {
            isAuthenticated: !!user,
            userId: user?.id,
            email: user?.email
        });

        fetchDocuments();
    }, [user]); // Add user as a dependency to refetch when auth changes

    useEffect(() => {
        // Check for messages from other components
        if (location.state?.message) {
            setAlertMessage(location.state.message);
            // Clear the message after 5 seconds
            const timer = setTimeout(() => {
                setAlertMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [location.state]);

    const fetchDocuments = async (retryCount = 0) => {
        try {
            console.log(`Starting to fetch documents${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`);
            setLoading(true);
            setError('');

            // Check if user is authenticated
            if (!user || !user.id) {
                console.warn('Attempting to fetch documents without authenticated user');
                setError('You must be logged in to view documents');
                setDocuments({ owned: [], shared: [] });
                setLoading(false);
                return;
            }

            // Add a timeout to handle case where API never responds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
            );

            const fetchPromise = documentService.getDocuments();

            // Race between the fetch and the timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            console.log('Documents fetch successful:', response.data);

            // Check if the response data has the expected structure
            if (!response.data || typeof response.data !== 'object') {
                throw new Error('Unexpected response format from server');
            }

            // Ensure we have arrays even if the server returns null
            const ownedDocs = Array.isArray(response.data.owned) ? response.data.owned : [];
            const sharedDocs = Array.isArray(response.data.shared) ? response.data.shared : [];

            setDocuments({
                owned: ownedDocs,
                shared: sharedDocs
            });

            console.log(`Loaded ${ownedDocs.length} owned and ${sharedDocs.length} shared documents`);
        } catch (err) {
            console.error('Error fetching documents:', err);

            let errorMessage = 'Error connecting to the server.';

            if (err.message.includes('timeout')) {
                errorMessage = 'Server request timed out. Please ensure the backend is running and try again.';
            } else if (err.response?.status === 401) {
                errorMessage = 'Authentication error. Please log in again.';
            } else if (err.response?.data?.error) {
                errorMessage = `Server error: ${err.response.data.error}`;
            }

            // If we still have retries left and this is a timeout or network error, try again
            const isNetworkError = !err.response || err.message.includes('timeout') || err.message.includes('Network Error');
            if (retryCount < 2 && isNetworkError) {
                console.log(`Retrying (${retryCount + 1}/2) in 2 seconds...`);

                // Wait 2 seconds before retrying
                setTimeout(() => {
                    fetchDocuments(retryCount + 1);
                }, 2000);
                return;
            }

            setError(errorMessage);
            // Initialize with empty arrays to show empty state
            setDocuments({ owned: [], shared: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        fetchDocuments();
    };

    const handleDeletePrompt = (doc, e) => {
        e.preventDefault();
        e.stopPropagation();
        setDocumentToDelete(doc);
        setShowDeleteModal(true);
    };

    const handleDeleteDocument = async () => {
        if (!documentToDelete) return;

        try {
            setDeleting(true);
            await documentService.deleteDocument(documentToDelete.id);

            // Remove the document from the state
            setDocuments(prev => ({
                ...prev,
                owned: prev.owned.filter(doc => doc.id !== documentToDelete.id)
            }));

            setAlertMessage('Document deleted successfully');
        } catch (err) {
            console.error('Delete error:', err);
            setAlertMessage('Error deleting document. Please try again.');
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
            setDocumentToDelete(null);
        }
    };

    const handleDownload = async (documentId) => {
        try {
            const response = await documentService.getDownloadUrl(documentId);
            window.open(response.data.downloadUrl, '_blank');
        } catch (err) {
            console.error('Download error:', err);
            alert('Error downloading file. Please try again.');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getFileTypeIcon = (fileName) => {
        if (!fileName) return <HiOutlineDocumentText />;

        const extension = fileName.split('.').pop().toLowerCase();

        switch (extension) {
            case 'pdf':
                return <HiOutlineDocumentText className="text-danger" />;
            case 'doc':
            case 'docx':
                return <HiOutlineDocumentText className="text-primary" />;
            case 'xls':
            case 'xlsx':
                return <HiOutlineDocumentText className="text-success" />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return <HiOutlineDocumentText className="text-warning" />;
            default:
                return <HiOutlineDocumentText className="text-secondary" />;
        }
    };

    const renderDocumentCard = (doc) => {
        if (!doc || !doc.id) {
            return (
                <Card className="mb-3 shadow-sm document-card">
                    <Card.Body className="p-4 text-center text-muted">
                        <p>Invalid document data</p>
                    </Card.Body>
                </Card>
            );
        }

        let fileUrl = doc.file_url || '';

        return (
            <Card className="mb-3 shadow-sm document-card">
                <Card.Body>
                    <Row>
                        <Col md={3} className="mb-3 mb-md-0">
                            <Link to={`/documents/${doc.id}`} className="text-decoration-none">
                                <DocumentThumbnail documentId={doc.id} fileName={fileUrl} />
                            </Link>
                        </Col>
                        <Col md={9}>
                            <div className="d-flex justify-content-between align-items-start h-100">
                                <div className="d-flex flex-column h-100">
                                    <Link to={`/documents/${doc.id}`} className="text-decoration-none">
                                        <Card.Title className={`h5 mb-1 ${doc.access_level !== 'owner' ? 'text-primary' : ''}`} style={{
                                            textDecoration: doc.access_level !== 'owner' ? 'underline' : 'none'
                                        }}>
                                            {doc.title || "Untitled Document"}
                                        </Card.Title>
                                    </Link>
                                    <Card.Text className="text-muted small mb-1">
                                        {doc.description || "No description"}
                                    </Card.Text>
                                    <div className="d-flex align-items-center mt-2 small text-muted">
                                        <HiOutlineClock className="me-1" />
                                        <span>{formatDate(doc.created_at || new Date())}</span>
                                        {doc.access_level && doc.access_level !== 'owner' && (
                                            <Badge bg="info" className="ms-2">{doc.access_level}</Badge>
                                        )}
                                    </div>
                                    <div className="mt-auto pt-3">
                                        <FilePreview documentId={doc.id} fileName={fileUrl} />
                                    </div>
                                </div>
                                <div className="d-flex flex-column">
                                    {doc.access_level === 'owner' && (
                                        <>
                                            <Link to={`/documents/${doc.id}`}>
                                                <BsButton variant="outline-primary" size="sm" className="mb-2">
                                                    <HiOutlineShare className="me-1" /> Share
                                                </BsButton>
                                            </Link>
                                            <BsButton
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={(e) => handleDeletePrompt(doc, e)}
                                            >
                                                <HiOutlineTrash className="me-1" /> Delete
                                            </BsButton>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        );
    };

    const renderEmptyState = (type) => (
        <Card className="text-center p-5 shadow-sm">
            <Card.Body>
                <div className="my-4">
                    {type === 'owned' ? (
                        <HiOutlineUpload className="text-muted" size={50} />
                    ) : (
                        <HiOutlineShare className="text-muted" size={50} />
                    )}
                </div>
                <Card.Title>
                    {type === 'owned' ? 'No documents yet' : 'No shared documents'}
                </Card.Title>
                <Card.Text className="text-muted">
                    {type === 'owned'
                        ? 'Start by uploading your first document'
                        : 'Documents shared with you will appear here'
                    }
                </Card.Text>
                {type === 'owned' && (
                    <Link to="/upload">
                        <BsButton variant="primary">Upload Document</BsButton>
                    </Link>
                )}
            </Card.Body>
        </Card>
    );

    const renderNoDocuments = (message) => (
        <div className="text-center py-5">
            <HiOutlineInformationCircle size={48} className="text-muted mb-3" />
            <h3 className="h5 text-muted">{message}</h3>
            {activeTab === 'owned' && (
                <Button
                    variant="primary"
                    className="mt-3"
                    onClick={() => navigate('/upload')}
                >
                    <HiOutlineUpload className="me-1" /> Upload Document
                </Button>
            )}
        </div>
    );

    if (loading) {
        return (
            <Container className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading your documents...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-5">
                <Card className="text-center p-5 shadow-sm">
                    <Card.Body>
                        <div className="my-4 text-danger">
                            <HiOutlineInformationCircle size={50} />
                        </div>
                        <Card.Title>Connection Error</Card.Title>
                        <Card.Text>{error}</Card.Text>
                        <BsButton
                            variant="primary"
                            onClick={handleRetry}
                            className="mt-3"
                        >
                            <HiOutlineRefresh className="me-2" /> Retry Connection
                        </BsButton>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    return (
        <Container>
            {alertMessage && (
                <Alert
                    variant={alertMessage.includes('error') ? 'danger' : 'success'}
                    className="mt-3"
                    dismissible
                    onClose={() => setAlertMessage('')}
                >
                    {alertMessage}
                </Alert>
            )}

            <Row className="mb-4 align-items-center">
                <Col>
                    <h1 className="h3 mb-0">Welcome, {user?.email}</h1>
                    <p className="text-muted">Manage your secure documents</p>
                </Col>
                <Col xs="auto">
                    <Link to="/upload">
                        <BsButton variant="primary">
                            <HiOutlineUpload className="me-2" />
                            Upload New Document
                        </BsButton>
                    </Link>
                </Col>
            </Row>

            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
            >
                <Tab
                    eventKey="owned"
                    title={
                        <span>
                            <HiOutlineDocumentText className="me-1" />
                            My Documents ({documents.owned?.length || 0})
                        </span>
                    }
                >
                    {documents.owned?.length > 0 ? (
                        documents.owned.map(doc => (
                            <div key={doc.id}>
                                {renderDocumentCard(doc)}
                            </div>
                        ))
                    ) : (
                        renderNoDocuments('No documents yet')
                    )}
                </Tab>
                <Tab
                    eventKey="shared"
                    title={
                        <span>
                            <HiOutlineShare className="me-1" />
                            Shared With Me ({documents.shared?.length || 0})
                        </span>
                    }
                >
                    {documents.shared?.length > 0 ? (
                        <>
                            <div className="alert alert-info mb-3">
                                <HiOutlineInformationCircle className="me-2" />
                                Click on a document title or thumbnail to view the document. These documents are shared with you in read-only mode.
                            </div>
                            {documents.shared.map(doc => (
                                <div key={doc.id}>
                                    {renderDocumentCard(doc)}
                                </div>
                            ))}
                        </>
                    ) : (
                        renderNoDocuments('No shared documents')
                    )}
                </Tab>
            </Tabs>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Delete Document</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to delete "{documentToDelete?.title}"?</p>
                    <p className="text-danger mb-0">This action cannot be undone.</p>
                </Modal.Body>
                <Modal.Footer>
                    <BsButton
                        variant="secondary"
                        onClick={() => setShowDeleteModal(false)}
                        disabled={deleting}
                    >
                        Cancel
                    </BsButton>
                    <BsButton
                        variant="danger"
                        onClick={handleDeleteDocument}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting...' : 'Delete Document'}
                    </BsButton>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default Dashboard; 