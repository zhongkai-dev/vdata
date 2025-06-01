import React, { useEffect } from 'react';
import { Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  // Apply no-scroll class when component mounts
  useEffect(() => {
    document.body.classList.add('no-scroll');
    
    // Remove the class when component unmounts
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const handleGoBack = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <div className="full-page-container">
      {/* Video Background */}
      <video autoPlay loop muted poster="/video/poster.jpg" className="bg-video">
        <source src="/video/bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      <div className="modern-login-container">
        <Card className="glass-container">
          <Card.Body>
            <div className="login-header">
              <h2>Page Not Found</h2>
              <p>The page you are looking for doesn't exist or has been moved</p>
            </div>
            
            <div className="text-center my-4">
              <div style={{ margin: '20px 0' }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 576 512" 
                  width="80" 
                  height="80" 
                  style={{ fill: '#FFD54F' }}
                >
                  <path d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"/>
                </svg>
              </div>
              <p className="mt-4 mb-0" style={{ color: '#FFFFFF', fontSize: '1.2rem', fontWeight: '600' }}>Error 404</p>
              <p style={{ color: '#E3F2FD', fontSize: '1rem' }}>We couldn't find the page you requested</p>
            </div>
            
            <Button 
              onClick={handleGoBack}
              className="btn-modern-primary w-100"
              style={{ backgroundColor: '#7c83f7', color: 'white' }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 448 512" 
                width="16" 
                height="16" 
                style={{ fill: 'currentColor', marginRight: '8px' }}
              >
                <path d="M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"/>
              </svg>
              Go Back
            </Button>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default NotFound; 