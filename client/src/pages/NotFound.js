import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import Button from '../components/Button';

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <HiOutlineExclamationCircle className="h-20 w-20 text-gray-400 mb-6" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Page Not Found</h1>
            <p className="text-gray-600 mb-8 text-center max-w-md">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link to="/">
                <Button>Return to Dashboard</Button>
            </Link>
        </div>
    );
};

export default NotFound; 