import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import {
    HiOutlineDocumentText,
    HiX,
    HiOutlineExternalLink,
    HiOutlineDownload
} from 'react-icons/hi';
import { documentService } from '../services/api';
import {
    getFileExtension,
    extractFilenameFromUrl,
    isPreviewableFile
} from '../utils/fileUtils';
import JSONRenderer from './JSONRenderer';
import TextRenderer from './TextRenderer';

// Component for displaying file preview and download options
const FilePreview = ({ documentId, fileName }) => {
    const [showModal, setShowModal] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [downloadLoading, setDownloadLoading] = useState(false);

    const extension = getFileExtension(fileName);

    const handleOpenPreview = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await documentService.getDownloadUrl(documentId);

            if (!response.data || !response.data.downloadUrl) {
                throw new Error('No download URL received from server');
            }

            const url = response.data.downloadUrl;
            console.log('Received download URL:', url);

            // Validate URL before showing modal
            if (!url.startsWith('http')) {
                throw new Error('Invalid download URL format');
            }

            setDownloadUrl(url);
            setShowModal(true);
        } catch (err) {
            console.error('Preview error:', err);
            setError('Error loading preview: ' + (err?.response?.data?.error || err.message || 'Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleClosePreview = () => {
        setShowModal(false);
    };

    const handleDirectDownload = async (e) => {
        if (e) e.stopPropagation();

        try {
            setDownloadLoading(true);
            setError('');

            // Get the proper filename for display
            let downloadFilename = fileName;

            // If the filename is just a UUID or path, extract a better name
            if (fileName && (fileName.includes('/') || fileName.length > 30 && !fileName.includes('.'))) {
                const parts = fileName.split('_');
                if (parts.length >= 3) {
                    // Extract the original filename from userId_timestamp_originalname
                    downloadFilename = parts.slice(2).join('_');
                }
            }

            console.log(`Initiating download for ${documentId} as ${downloadFilename}`);

            // Use the service method for downloading
            await documentService.downloadDocument(documentId, downloadFilename);
        } catch (err) {
            console.error('Download error:', err);
            setError('Error downloading file: ' + (err.message || 'Please try again.'));
        } finally {
            setDownloadLoading(false);
        }
    };

    // Render different preview buttons based on file type
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
                    <HiOutlineExternalLink className="me-1" />
                    {loading ? 'Loading...' : 'Preview'}
                </Button>
            );
        }
        return null;
    };

    const renderPreviewContent = () => {
        if (!downloadUrl) return <div className="text-center p-5">Loading preview...</div>;

        try {
            console.log('Attempting to render preview with URL:', downloadUrl);
            console.log('File extension:', extension);

            // Use custom renderer for JSON files
            if (extension === 'json') {
                return <JSONRenderer mainState={{ currentDocument: { uri: downloadUrl } }} />;
            }

            // Use text renderer for SQL and other text files
            if (['sql', 'txt', 'md', 'csv'].includes(extension)) {
                return <TextRenderer mainState={{ currentDocument: { uri: downloadUrl } }} />;
            }

            return (
                <DocViewer
                    documents={[{ uri: downloadUrl, fileName }]}
                    pluginRenderers={DocViewerRenderers}
                    style={{ height: 'calc(100vh - 200px)' }}
                    config={{
                        header: {
                            disableHeader: false,
                            disableFileName: false,
                            retainURLParams: true
                        },
                        loadingRenderer: {
                            overrideComponent: () => <div className="text-center p-5">Loading document...</div>
                        }
                    }}
                    onError={(error) => {
                        console.error('DocViewer error:', error);
                        setError('Error rendering preview: ' + (error?.message || 'Unknown error'));
                    }}
                />
            );
        } catch (error) {
            console.error("Error rendering preview:", error);
            return (
                <div className="text-center p-5 text-danger">
                    <p>Error rendering preview. This file type may not be supported for preview.</p>
                    <p className="small text-muted mb-3">Error details: {error.message || 'Unknown error'}</p>
                    <Button
                        variant="primary"
                        onClick={handleDirectDownload}
                        disabled={downloadLoading}
                    >
                        <HiOutlineDownload className="me-1" />
                        {downloadLoading ? 'Downloading...' : 'Download'}
                    </Button>
                </div>
            );
        }
    };

    return (
        <>
            <div className="d-flex">
                {getPreviewButton()}
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleDirectDownload}
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
                        <HiOutlineDocumentText className="me-2 fs-4" />
                        <span className="text-truncate">{fileName || 'Document Preview'}</span>
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
                        onClick={handleDirectDownload}
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