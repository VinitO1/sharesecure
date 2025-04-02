# ShareSecure

ShareSecure is a secure document sharing application that allows users to upload, share, and manage documents with fine-grained access control.

## Features

- **Secure Authentication:** User authentication with Supabase Auth
- **Document Management:** Upload, download, and manage documents securely
- **Read-Only Sharing:** Share documents with other users with read-only access
- **Built-in File Preview:** Preview supported file types directly in the browser:
  - Images (jpg, jpeg, png, gif, bmp, webp, svg)
  - PDFs with native browser rendering
  - Text files (txt, csv, html, xml, md, rtf)
  - Code files (js, jsx, ts, tsx, py, java, c, cpp, h, cs, json, css, php)
- **Document Thumbnails:** Visual thumbnails for different file types
- **Modern User Interface:** Polished, responsive UI built with React and Bootstrap
- **Intuitive Sharing:** Clean sharing interface with user avatars and clear permissions

## Project Structure

The project consists of two main parts:

- **Backend**: Node.js with Express and Supabase integration
- **Frontend**: React with Bootstrap CSS

## Technical Stack

### Backend

- Node.js
- Express
- Supabase (for authentication, database, and storage)
- Multer (for file uploads)

### Frontend

- React 19
- React Router 7
- Bootstrap 5
- React-Bootstrap
- Axios
- React Icons
- Custom file preview system

## Getting Started

### Prerequisites

- Node.js 14+ installed
- Supabase account and project set up

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/sharesecure.git
cd sharesecure
```

2. Install backend dependencies:

```bash
cd server
npm install
```

3. Install frontend dependencies:

```bash
cd ../client
npm install
```

4. Create `.env` files in both `server` and `client` directories with your Supabase credentials:

Server `.env`:

```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Client `.env`:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the Application

1. Start the backend server:

```bash
cd server
npm run dev
```

2. Start the frontend development server:

```bash
cd client
npm start
```

3. Open your browser and navigate to `http://localhost:3000`.

## Core Functionality

### Document Preview

ShareSecure includes a custom document preview system that supports:

- **Images:** Renders images using native HTML `<img>` tags
- **PDFs:** Uses the browser's built-in PDF viewer through an iframe
- **Text & Code:** Shows text files with appropriate formatting based on file type
- **Fallback:** Provides download options for unsupported file types

The preview system is designed to be compatible with React 19, ensuring optimal performance and reliability.

### Document Sharing

Documents can be shared with other users with read-only access:

- Simple sharing interface with email input
- Clear indication of read-only permissions
- Visual user list showing who has access to a document
- Ability to remove access for specific users

### User Interface

The application features a modern, clean UI with:

- Responsive layout for desktop and mobile devices
- Intuitive navigation and document organization
- Visual document thumbnails for easy recognition
- Polished sharing interface with avatars and badges

## Database Structure

The application uses the following database structure in Supabase:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_level TEXT CHECK (access_level IN ('read')),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (document_id, user_id)
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'view', 'download', 'share', etc.
  details JSONB, -- Additional action-specific information
  created_at TIMESTAMP DEFAULT now()
);
```

## Storage Configuration

The application uses Supabase Storage for document storage. Ensure you have set up the following:

1. Create a bucket named "documents" in Supabase Storage
2. Configure RLS policies for the bucket to secure access

## Future Enhancements

- Document versioning and history
- Team workspaces for improved collaboration
- Enhanced security with two-factor authentication
- Mobile app versions
- Additional file preview support for more formats

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Supabase team for the excellent backend-as-a-service platform
- React community for the powerful frontend library
- All open-source projects that made this application possible
