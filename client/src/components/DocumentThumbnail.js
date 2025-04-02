import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { documentService } from '../services/api';
import {
    HiOutlineDocumentText,
    HiOutlinePhotograph,
    HiOutlineTable,
    HiOutlineCode,
    HiOutlineFilm,
    HiOutlineExclamation
} from 'react-icons/hi';
import { getFileExtension, getFileIconType } from '../utils/fileUtils';

const DocumentThumbnail = ({ documentId, fileName }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const extension = getFileExtension(fileName);

    useEffect(() => {
        let isMounted = true;

        // Only load thumbnails for image files
        const loadThumbnail = async () => {
            // Reset states
            if (isMounted) {
                setLoading(true);
                setError(false);
                setThumbnailUrl(null);
            }

            // Skip API call if it's not an image file
            if (!isImageFile(extension)) {
                if (isMounted) setLoading(false);
                return;
            }

            try {
                const response = await documentService.getDownloadUrl(documentId);

                if (isMounted && response.data && response.data.downloadUrl) {
                    setThumbnailUrl(response.data.downloadUrl);
                }
            } catch (err) {
                console.error('Thumbnail error:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Execute loading
        loadThumbnail();

        // Cleanup function to prevent state updates on unmounted component
        return () => {
            isMounted = false;
        };
    }, [documentId, fileName, extension]);

    const isImageFile = (extension) => {
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension.toLowerCase());
    };

    const getFileTypeIcon = () => {
        if (!fileName) return <HiOutlineDocumentText className="text-secondary" size={40} />;

        const iconType = getFileIconType(extension);

        switch (iconType) {
            case 'document':
                return extension === 'pdf'
                    ? <HiOutlineDocumentText className="text-danger" size={40} />
                    : <HiOutlineDocumentText className="text-primary" size={40} />;
            case 'spreadsheet':
                return <HiOutlineTable className="text-success" size={40} />;
            case 'image':
                return <HiOutlinePhotograph className="text-warning" size={40} />;
            case 'video':
                return <HiOutlineFilm className="text-purple" size={40} />;
            case 'code':
            case 'text':
                return <HiOutlineCode className="text-info" size={40} />;
            default:
                return <HiOutlineDocumentText className="text-secondary" size={40} />;
        }
    };

    const renderThumbnail = () => {
        if (loading) {
            return (
                <div className="d-flex justify-content-center align-items-center bg-light rounded-3 document-thumbnail" style={{ height: '120px' }}>
                    <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            );
        }

        if (error || !isImageFile(extension) || !thumbnailUrl) {
            return (
                <div className="d-flex justify-content-center align-items-center bg-light rounded-3 document-thumbnail" style={{ height: '120px' }}>
                    {getFileTypeIcon()}
                </div>
            );
        }

        return (
            <div
                className="rounded-3 bg-light overflow-hidden document-thumbnail"
                style={{ height: '120px' }}
            >
                <img
                    src={thumbnailUrl}
                    alt="Document preview"
                    className="w-100 h-100 object-fit-cover"
                    onError={() => setError(true)}
                />
            </div>
        );
    };

    return renderThumbnail();
};

export default DocumentThumbnail; 