/**
 * Utilities for handling files
 */

/**
 * Extract file extension from a filename
 * @param {string} filename - The filename to extract extension from
 * @returns {string} The lowercase file extension without the dot
 */
export const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Extract a filename from a URL or path
 * @param {string} url - The URL or path containing the filename
 * @param {string} fallbackName - Fallback name to use if extraction fails
 * @returns {string} The extracted filename or fallback
 */
export const extractFilenameFromUrl = (url, fallbackName) => {
    if (!url) return fallbackName;

    // Try to extract filename from URL
    const urlParts = url.split('/');
    let extractedName = urlParts[urlParts.length - 1];

    // Remove query parameters if they exist
    if (extractedName.includes('?')) {
        extractedName = extractedName.split('?')[0];
    }

    // URL-decode the filename
    try {
        extractedName = decodeURIComponent(extractedName);
    } catch (e) {
        console.error("Error decoding URL:", e);
    }

    // If we couldn't extract a reasonable filename, use the fallback
    if (!extractedName || extractedName.length < 3) {
        return fallbackName;
    }

    return extractedName;
};

/**
 * Download a file from a URL
 * @param {string} url - The URL to download the file from
 * @param {string} filename - The filename to save as
 */
export const downloadFile = async (url, filename) => {
    if (!url) return;

    try {
        // Fetch the file content
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
        }

        // Convert to blob
        const blob = await response.blob();

        // Create object URL
        const objectUrl = URL.createObjectURL(blob);

        // Create link and trigger download
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename; // Set the filename

        // Required for Firefox
        link.style.display = 'none';
        document.body.appendChild(link);

        // Trigger download
        link.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        }, 100);

        return true;
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
};

/**
 * Determine if a file type is previewable
 * @param {string} extension - The file extension to check
 * @returns {boolean} Whether the file can be previewed
 */
export const isPreviewableFile = (extension) => {
    const previewableExtensions = [
        'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
        'txt', 'csv', 'md', 'json', 'sql'
    ];

    return previewableExtensions.includes(extension.toLowerCase());
};

/**
 * Get the icon type based on file extension
 * @param {string} extension - The file extension
 * @returns {string} The icon type (document, image, spreadsheet, etc.)
 */
export const getFileIconType = (extension) => {
    if (!extension) return 'document';

    const ext = extension.toLowerCase();

    // Document types
    if (['pdf', 'doc', 'docx', 'rtf', 'odt', 'txt'].includes(ext)) {
        return 'document';
    }

    // Image types
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
        return 'image';
    }

    // Spreadsheet types
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
        return 'spreadsheet';
    }

    // Presentation types
    if (['ppt', 'pptx', 'odp'].includes(ext)) {
        return 'presentation';
    }

    // Video types
    if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) {
        return 'video';
    }

    // Audio types
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
        return 'audio';
    }

    // Archive types
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return 'archive';
    }

    // Code types
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'sql'].includes(ext)) {
        return 'code';
    }

    return 'document'; // Default
}; 