import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminLogin = () => {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, user, checkUserRole } = useContext(AuthContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect if already logged in as an admin
    if (user) {
      if (user.isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        // If regular user tries to access admin login, redirect to user dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);
  
  // Apply no-scroll class when component mounts
  useEffect(() => {
    document.body.classList.add('no-scroll');
    
    // Remove the class when component unmounts
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!userId || userId.length !== 6 || !/^\d+$/.test(userId)) {
      setError('Please enter a valid 6-digit admin ID');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // First check if the user is an admin before completing login
      try {
        const roleCheck = await checkUserRole(userId);
        if (!roleCheck) {
          setError('Access denied: This portal is for administrators only');
          setLoading(false);
          return;
        }
      } catch (roleError) {
        console.error('Role check failed:', roleError);
        // If we can't check the role, show a general error
        setError('Error verifying credentials. Try again later.');
        setLoading(false);
        return;
      }
      
      // Continue with login for admin users
      const userData = await login(userId);
      
      // Double-check that the user is actually an admin
      if (!userData.isAdmin) {
        setError('Access denied: This portal is for administrators only');
        // Logout immediately
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }
      
      navigate('/admin/dashboard', { replace: true });
    } catch (error) {
      setError(error.message || 'Invalid admin ID');
    } finally {
      setLoading(false);
    }
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
              <h2>Admin Portal</h2>
              <p>Enter your admin credentials to continue</p>
            </div>
            
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form onSubmit={handleSubmit} className="modern-form">
              <Form.Group className="mb-4">
                <Form.Label>Admin ID</Form.Label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0 text-light">
                    <i className="fas fa-user-shield"></i>
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Enter your 6-digit admin ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    maxLength={6}
                    className="border-start-0"
                  />
                </div>
                <Form.Text>Only admin users can log in here</Form.Text>
              </Form.Group>
              
              <Button 
                type="submit" 
                className="btn-modern-primary w-100" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt me-2"></i>
                    Admin Login
                  </>
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin; 