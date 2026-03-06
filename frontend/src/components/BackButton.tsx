import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@radix-ui/themes';

const BackButton: React.FC = () => {
    const navigate = useNavigate();
    return (
        <Button className='back-button' onClick={() => navigate(-1)} color='gray' variant='outline' highContrast>
            ← Back
        </Button>
    );
};

export default BackButton;