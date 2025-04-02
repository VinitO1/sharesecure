import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import {
    HiOutlineDocumentText,
    HiOutlineExternalLink,
    HiOutlineDownload,
    HiOutlineCode,
    HiOutlinePhotograph
} from 'react-icons/hi';
import { documentService } from '../services/api';
import { getFileExtension, isPreviewableFile, getPreviewType } from '../utils/fileUtils';

const FilePreview = ({ documentId, fileName }) => {
    const [showModal, setShowModal] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [downloadLoading, setDownloadLoading] = useState(false);

    const extension = getFileExtension(fileName);
    const previewType = getPreviewType(extension);

    const fetchDownloadUrl = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await documentService.getDownloadUrl(documentId);

            if (!response.data || !response.data.downloadUrl) {
                throw new Error('No download URL received from server');
            }

            const url = response.data.downloadUrl;
            console.log('Received download URL:', url);

            // Validate URL before using
            if (!url.startsWith('http')) {
                throw new Error('Invalid download URL format');
            }

            setDownloadUrl(url);
            return url;
        } catch (err) {
            console.error('Preview error:', err);
            setError('Error loading preview: ' + (err?.response?.data?.error || err.message || 'Please try again.'));
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPreview = async () => {
        const url = await fetchDownloadUrl();
        if (url) {
            setShowModal(true);
        }
    };

    const handleClosePreview = () => {
        setShowModal(false);
    };

    const handleDownload = async (e) => {
        if (e) e.stopPropagation();

        try {
            setDownloadLoading(true);

            // If we don't have the URL yet, fetch it
            let url = downloadUrl;
            if (!url) {
                url = await fetchDownloadUrl();
                if (!url) {
                    throw new Error('Failed to get download URL');
                }
            }

            window.open(url, '_blank');
        } catch (err) {
            console.error('Download error:', err);
            setError('Error downloading file: ' + (err.message || 'Please try again.'));
        } finally {
            setDownloadLoading(false);
        }
    };

    // Render preview button based on file type
    const getPreviewButton = () => {
        if (isPreviewableFile(extension)) {
            return (
                <Button
                    variant="light"
                    size="sm"
                    className="me-2 preview-btn"
                    onClick={handleOpenPreview}
                    disabled={loading}
                >
                    {previewType === 'image' ? (
                        <HiOutlinePhotograph className="me-1" />
                    ) : previewType === 'code' ? (
                        <HiOutlineCode className="me-1" />
                    ) : (
                        <HiOutlineExternalLink className="me-1" />
                    )}
                    {loading ? 'Loading...' : 'Preview'}
                </Button>
            );
        }
        return null;
    };

    // Render the file preview content
    const renderPreviewContent = () => {
        if (!downloadUrl) return <div className="text-center p-5">Loading preview...</div>;

        try {
            // Handle different preview types based on file extension
            switch (previewType) {
                case 'image':
                    return (
                        <div className="text-center p-3" style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
                            <img
                                src={downloadUrl}
                                alt="Document preview"
                                className="mw-100 h-auto"
                                onError={() => setError('Error loading image')}
                            />
                        </div>
                    );

                case 'pdf':
                    return (
                        <div style={{ height: 'calc(100vh - 200px)' }}>
                            <iframe
                                src={`${downloadUrl}#toolbar=0`}
                                title="PDF Preview"
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                            />
                        </div>
                    );

                case 'text':
                case 'code':
                    const isCode = previewType === 'code';
                    return (
                        <div className="p-3" style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
                            <div className={`alert alert-${isCode ? 'secondary' : 'info'} mb-3`}>
                                <p className="mb-0">
                                    {isCode
                                        ? `This is a code file (${extension.toUpperCase()}) and may not display with proper formatting.`
                                        : `This is a text file and may not display correctly in preview.`
                                    }
                                </p>
                            </div>
                            <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary mb-3"
                            >
                                Open in New Tab
                            </a>
                            <div
                                className="border rounded p-3 bg-light"
                                style={{
                                    maxHeight: '500px',
                                    overflow: 'auto',
                                    fontFamily: isCode ? 'monospace' : 'inherit',
                                    whiteSpace: isCode ? 'pre' : 'pre-wrap',
                                    fontSize: isCode ? '0.9rem' : 'inherit'
                                }}
                            >
                                <iframe
                                    src={downloadUrl}
                                    title={`${isCode ? 'Code' : 'Text'} Preview`}
                                    width="100%"
                                    height="500px"
                                    style={{ border: 'none' }}
                                />
                            </div>
                        </div>
                    );

                default:
                    // Not directly previewable
                    return (
                        <div className="text-center p-5">
                            <p>Preview is not available for this file type ({extension.toUpperCase()}).</p>
                            <Button
                                variant="primary"
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-3"
                            >
                                <HiOutlineExternalLink className="me-1" />
                                Open File in New Tab
                            </Button>
                            <div className="mt-3">
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleDownload}
                                    disabled={downloadLoading}
                                >
                                    <HiOutlineDownload className="me-1" />
                                    {downloadLoading ? 'Downloading...' : 'Download File'}
                                </Button>
                            </div>
                        </div>
                    );
            }
        } catch (error) {
            console.error("Error rendering preview:", error);
            return (
                <div className="text-center p-5 text-danger">
                    <p>Error rendering preview. This file type may not be supported.</p>
                    <p className="small text-muted mb-3">Error details: {error.message || 'Unknown error'}</p>
                    <Button
                        variant="primary"
                        onClick={handleDownload}
                        disabled={downloadLoading}
                    >
                        <HiOutlineDownload className="me-1" />
                        {downloadLoading ? 'Downloading...' : 'Download'}
                    </Button>
                </div>
            );
        }
    };

    const getModalTitle = () => {
        let icon = <HiOutlineDocumentText />;

        if (previewType === 'image') {
            icon = <HiOutlinePhotograph />;
        } else if (previewType === 'code') {
            icon = <HiOutlineCode />;
        }

        return (
            <span className="d-flex align-items-center">
                {React.cloneElement(icon, { className: "me-2 fs-4" })}
                <span className="text-truncate">{fileName || 'Document Preview'}</span>
            </span>
        );
    };

    return (
        <>
            <div className="d-flex">
                {getPreviewButton()}
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleDownload}
                    disabled={downloadLoading}
                >
                    <HiOutlineDownload className="me-1" />
                    {downloadLoading ? 'Downloading...' : 'Download'}
                </Button>
            </div>

            {error && <div className="text-danger small mt-1">{error}</div>}

            <Modal
                show={showModal}
                onHide={handleClosePreview}
                size="lg"
                centered
                dialogClassName="file-preview-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center">
                        {getModalTitle()}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    {renderPreviewContent()}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClosePreview}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleDownload}
                        disabled={downloadLoading}
                    >
                        <HiOutlineDownload className="me-1" />
                        {downloadLoading ? 'Downloading...' : 'Download'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default FilePreview; 