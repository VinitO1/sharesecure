# ShareSecure Frontend

This is the frontend application for ShareSecure, a secure document sharing platform. It's built with React and provides a modern, responsive user interface for managing and sharing documents.

## Features

- **Document Management:** Upload, view, download, and share documents
- **Custom File Preview:** Built-in preview for images, PDFs, text files, and code
- **Document Thumbnails:** Visual thumbnails for different file types
- **Modern Sharing Interface:** Intuitive UI for sharing documents with others
- **Responsive Design:** Optimized for both desktop and mobile devices

## Tech Stack

- **React 19:** Latest version of React for building the UI
- **React Router 7:** For application routing
- **Bootstrap 5:** For responsive layouts and UI components
- **React-Bootstrap:** React components for Bootstrap
- **Axios:** For API requests to the backend
- **React Icons:** For beautiful, consistent icons
- **Custom File Preview:** Native browser-based file preview system

## Getting Started

### Prerequisites

- Node.js 14+ installed
- ShareSecure backend server running

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the Application

```bash
npm start
```

This will start the development server on [http://localhost:3000](http://localhost:3000).

## Project Structure

- **src/**
  - **components/**: Reusable UI components
    - **Button.js**: Custom button component
    - **Input.js**: Custom input component
    - **FilePreview.js**: Document preview component
    - **DocumentThumbnail.js**: Thumbnail component for documents
  - **contexts/**: React context providers
    - **AuthContext.js**: Authentication context
  - **pages/**: Application pages
    - **Login.js**: User login page
    - **Register.js**: User registration page
    - **Dashboard.js**: Main document management interface
    - **DocumentView.js**: Document viewing and sharing page
    - **Upload.js**: Document upload page
  - **services/**: API services
    - **api.js**: API client configuration and endpoints
  - **utils/**: Utility functions
    - **fileUtils.js**: File handling utilities

## Key Components

### FilePreview

A custom component for previewing various file types:

- Renders images using native `<img>` tags
- Displays PDFs using browser's built-in PDF viewer
- Shows text and code files with appropriate formatting
- Handles unsupported file types gracefully

### DocumentThumbnail

Displays visual representations of documents:

- Shows image thumbnails for image files
- Uses appropriate icons for different file types
- Provides visual cues about document type

### Document Sharing

Intuitive interface for sharing documents:

- Email input for recipient
- Clear read-only permission indication
- User list showing who has access to documents
- User avatars and permission badges

## Building for Production

```bash
npm run build
```

This will create an optimized production build in the `build` folder.

## Learn More

For more information about the ShareSecure application, see the main [README.md](../README.md) file.
