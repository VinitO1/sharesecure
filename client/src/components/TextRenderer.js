import React, { useState, useEffect } from 'react';
import { Spinner, Alert } from 'react-bootstrap';

const TextRenderer = ({ mainState }) => {
    const [textContent, setTextContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchText = async () => {
            try {
                setLoading(true);
                console.log('Fetching text from URL:', mainState.currentDocument.uri);

                const response = await fetch(mainState.currentDocument.uri, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'text/plain, text/html, application/sql, */*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch text: ${response.status} ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                console.log('Content-Type:', contentType);

                const text = await response.text();
                if (!text) {
                    throw new Error('Empty response received');
                }

                console.log(`Received ${text.length} characters of text`);
                setTextContent(text);
            } catch (err) {
                console.error('Error fetching text:', err);
                setError(err.message || 'Failed to load text content');
            } finally {
                setLoading(false);
            }
        };

        if (mainState.currentDocument) {
            fetchText();
        }
    }, [mainState.currentDocument]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center p-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="m-3">
                <Alert.Heading>Error Loading Text</Alert.Heading>
                <p>{error}</p>
            </Alert>
        );
    }

    return (
        <div className="text-renderer p-4 bg-light">
            <pre className="bg-white p-3 border rounded text-wrap" style={{ maxHeight: '70vh', overflow: 'auto' }}>
                {textContent}
            </pre>
        </div>
    );
};

export default TextRenderer; 