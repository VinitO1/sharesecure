import React, { useState, useEffect } from 'react';
import { Spinner, Alert } from 'react-bootstrap';

const JSONRenderer = ({ mainState }) => {
    const [jsonContent, setJsonContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchJson = async () => {
            try {
                setLoading(true);
                console.log('Fetching JSON from URL:', mainState.currentDocument.uri);

                const response = await fetch(mainState.currentDocument.uri, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || (!contentType.includes('application/json') && !contentType.includes('text/plain'))) {
                    console.warn('Response is not JSON, but attempting to parse anyway. Content-Type:', contentType);
                }

                try {
                    const data = await response.json();
                    setJsonContent(data);
                } catch (parseError) {
                    console.error('Error parsing JSON:', parseError);
                    // Try to get as text if JSON parsing fails
                    const text = await response.text();
                    setError(`Invalid JSON format: ${parseError.message}. First 100 characters: ${text.substring(0, 100)}...`);
                }
            } catch (err) {
                console.error('Error fetching JSON:', err);
                setError(err.message || 'Failed to load JSON content');
            } finally {
                setLoading(false);
            }
        };

        if (mainState.currentDocument) {
            fetchJson();
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
                <Alert.Heading>Error Loading JSON</Alert.Heading>
                <p>{error}</p>
            </Alert>
        );
    }

    return (
        <div className="json-renderer p-4 bg-light">
            <pre className="bg-white p-3 border rounded" style={{ maxHeight: '70vh', overflow: 'auto' }}>
                {JSON.stringify(jsonContent, null, 2)}
            </pre>
        </div>
    );
};

export default JSONRenderer; 