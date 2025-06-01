import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, user, checkUserRole } = useContext(AuthContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate(user.isAdmin ? '/admin/dashboard' : '/dashboard', { replace: true });
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
      setError('Please enter a valid 6-digit user ID');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // First check if the user is an admin
      try {
        const isAdmin = await checkUserRole(userId);
        if (isAdmin) {
          setError('User not found');
          setLoading(false);
          return;
        }
      } catch (roleError) {
        console.error('Role check failed:', roleError);
        // If we can't check the role, proceed with normal login
      }
      
      // Continue with login for regular users
      const userData = await login(userId);
      
      // Double-check the user is not an admin
      if (userData.isAdmin) {
        setError('User not found');
        // Logout immediately
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }
      
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError(error.message || 'Invalid user ID');
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
              <h2>Phone Number Generator</h2>
              <p>Enter your 6-digit ID to continue</p>
            </div>
            
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form onSubmit={handleSubmit} className="modern-form">
              <Form.Group className="mb-4">
                <Form.Label>User ID</Form.Label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0 text-light">
                    <i className="fas fa-user"></i>
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Enter your 6-digit user ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    maxLength={6}
                    className="border-start-0"
                  />
                </div>
                <Form.Text>Enter your assigned user ID to access the system</Form.Text>
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
                    Login
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

export default Login; 