import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Button, Form, Alert, Spinner, Container } from 'react-bootstrap';
import { getUserProfile, generatePhoneNumbers } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const UserDashboard = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [count, setCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Animation states
  const [errorVisible, setErrorVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorExiting, setErrorExiting] = useState(false);
  const [successExiting, setSuccessExiting] = useState(false);
  
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Handle alert animations
  useEffect(() => {
    if (error) {
      setErrorVisible(true);
      setErrorExiting(false);
    } else {
      setErrorVisible(false);
    }
    
    if (success) {
      setSuccessVisible(true);
      setSuccessExiting(false);
    } else {
      setSuccessVisible(false);
    }
  }, [error, success]);
  
  // Clear alerts after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        if (error) {
          setErrorExiting(true);
          setTimeout(() => setError(''), 300); // Wait for exit animation
        }
        if (success) {
          setSuccessExiting(true);
          setTimeout(() => setSuccess(''), 300); // Wait for exit animation
        }
      }, 5000); // Show for 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [error, success]);
  
  // Close alert handlers
  const closeError = useCallback(() => {
    setErrorExiting(true);
    setTimeout(() => setError(''), 300);
  }, []);
  
  const closeSuccess = useCallback(() => {
    setSuccessExiting(true);
    setTimeout(() => setSuccess(''), 300);
  }, []);
  
  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const data = await getUserProfile();
        setUserProfile(data);
      } catch (error) {
        setError('Failed to load user profile');
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);
  
  // Handle phone number generation
  const handleGenerateNumbers = async (e) => {
    e.preventDefault();
    
    const numCount = parseInt(count) || 0;
    if (!count || numCount <= 0) {
      setError('Please enter a valid number');
      return;
    }
    
    if (userProfile && numCount > (userProfile.phoneNumbersAssigned - userProfile.phoneNumbersUsed)) {
      setError(`You can only generate up to ${userProfile.phoneNumbersAssigned - userProfile.phoneNumbersUsed} Data`);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const data = await generatePhoneNumbers(numCount);
      
      // Update Data
      setPhoneNumbers(data.phoneNumbers.join('\n'));
      
      // Update only the used count, preserve other stats
      setUserProfile(prev => {
        // Make a deep copy to ensure original data isn't lost
        return {
          ...prev,
          phoneNumbersUsed: prev.phoneNumbersUsed + data.count
          // phoneNumbersAssigned remains unchanged
        };
      });
      
      setSuccess(`Successfully generated ${data.count} Data`);
    } catch (error) {
      console.error('Error generating data:', error);
      
      // Check for specific allocation error
      if (error.response?.status === 400 && 
          error.response?.data?.message?.includes('Not enough phone numbers allocated')) {
        setError(`You can only generate up to ${userProfile?.phoneNumbersAssigned - userProfile?.phoneNumbersUsed} Data`);
      } else {
        // Generic error message for other cases
        setError(error.response?.data?.message || 'Failed to generate Data');
      }
      
      // Refresh user profile to get accurate counts
      try {
        const updatedProfile = await getUserProfile();
        setUserProfile(updatedProfile);
      } catch (profileError) {
        console.error('Error refreshing profile:', profileError);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumbers);
    setSuccess('Data copied to clipboard!');
  };

  // Clear generated numbers
  const handleClear = () => {
    setPhoneNumbers('');
    setSuccess('Data cleared');
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  if (profileLoading) {
    return (
      <div className="text-center mt-5" style={{ color: '#fff' }}>
        <Spinner animation="border" variant="light" />
        <p>Loading your profile...</p>
      </div>
    );
  }
  
  return (
    <div style={{ 
      backgroundColor: '#0a0c10', 
      minHeight: '100vh',
      color: '#e9ebff',
      padding: '0'
    }}>
      {/* Simple Header - Reduced Height */}
      <header style={{ 
        borderBottom: '1px solid rgba(255,255,255,0.1)', 
        padding: '8px 15px',
        marginBottom: '8px',
        backgroundColor: '#111827'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              backgroundColor: '#7c83f7', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              fontWeight: 'bold',
              fontSize: '16px',
              color: 'white',
              boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 style={{ fontSize: '20px', margin: 0, fontWeight: '600' }}>
                {userProfile?.name}
              </h1>
              <p style={{ margin: 0, color: '#b5bdff', fontSize: '12px' }}>
                ID: {userProfile?.userId}
              </p>
            </div>
          </div>
          <Button 
            variant="outline-light" 
            size="sm"
            onClick={handleLogout}
            style={{ padding: '2px 8px', fontSize: '12px' }}
          >
            Logout
          </Button>
        </div>
      </header>
      
      <div className="user-dashboard-wrapper" style={{
        backgroundColor: '#070a10',
        minHeight: 'calc(100vh - 60px)',
        width: '100%'
      }}>
        <Container 
          className="py-2 dark-container" 
          style={{ 
            backgroundColor: '#070a10',
            color: '#e9ebff'
          }}
        >
          <style>
            {`
              /* Global dark theme for user dashboard */
              body {
                background-color: #070a10;
              }
              
              /* Override any Bootstrap white backgrounds */
              .dark-container.container {
                background-color: #070a10 !important;
              }
              
              /* Force dark background on all elements */
              .user-dashboard-wrapper,
              .user-dashboard-wrapper > *,
              .container, 
              .container-fluid,
              .row,
              .col,
              .card,
              .form,
              .modal-content,
              .dropdown-menu,
              .list-group,
              .toast,
              .alert {
                background-color: #070a10 !important;
              }
              
              /* Form controls */
              .dark-container .form-control,
              .form-control,
              .input-group-text,
              .custom-select,
              input,
              select,
              textarea {
                background-color: #131720 !important;
                color: #e9ebff !important;
                border-color: rgba(255, 255, 255, 0.2) !important;
              }
              
              .dark-container .btn {
                border-color: transparent !important;
              }
              
              .dark-container .form-text,
              .form-text {
                color: #a5d6ff !important;
              }
              
              /* Make data containers stand out against darker background */
              .user-dashboard-wrapper .card,
              .user-dashboard-wrapper .alert,
              div[style*="background-color: rgba(40, 44, 52, 0.8)"] {
                background-color: #111827 !important;
              }
              
              /* Fix any white borders or shadows */
              * {
                box-shadow: none !important;
              }
              
              /* Exception for profile circle */
              .profile-circle {
                box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2) !important;
              }
            `}
          </style>
          {error && (
            <Alert variant="danger" className="py-2 px-3" style={{
              backgroundColor: 'rgba(220, 53, 69, 0.15)',
              color: '#ff8a8a',
              border: '1px solid rgba(220, 53, 69, 0.2)',
              fontSize: '14px',
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 1050,
              minWidth: '280px',
              maxWidth: '350px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.3s ease',
              transform: errorVisible ? 'translateX(0)' : 'translateX(400px)',
              opacity: errorExiting ? 0 : 1,
              padding: '10px 15px'
            }}>
              <span>{error}</span>
              <button
                type="button"
                className="close"
                style={{ 
                  background: 'none',
                  border: 'none',
                  color: '#ff8a8a',
                  fontSize: '20px',
                  marginLeft: '10px',
                  padding: '0',
                  cursor: 'pointer'
                }}
                onClick={closeError}
              >
                &times;
              </button>
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="py-2 px-3" style={{
              backgroundColor: 'rgba(40, 167, 69, 0.15)',
              color: '#8affa5',
              border: '1px solid rgba(40, 167, 69, 0.2)',
              fontSize: '14px',
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 1050,
              minWidth: '280px',
              maxWidth: '350px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.3s ease',
              transform: successVisible ? 'translateX(0)' : 'translateX(400px)',
              opacity: successExiting ? 0 : 1,
              padding: '10px 15px'
            }}>
              <span>{success}</span>
              <button
                type="button"
                className="close"
                style={{ 
                  background: 'none',
                  border: 'none',
                  color: '#8affa5',
                  fontSize: '20px',
                  marginLeft: '10px',
                  padding: '0',
                  cursor: 'pointer'
                }}
                onClick={closeSuccess}
              >
                &times;
              </button>
            </Alert>
          )}
          
          {/* Phone Number Details - Reduced Height */}
          <div style={{ 
            backgroundColor: 'rgba(40, 44, 52, 0.8)', 
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Data</h3>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '6px',
              marginBottom: '6px'
            }}>
              <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                <i className="fas fa-layer-group" style={{ marginRight: '5px', color: '#a5b4fd' }}></i>
                Assigned Numbers:
              </span>
              <span style={{ color: '#a5b4fd', fontWeight: '600', fontSize: '13px' }}>{userProfile?.phoneNumbersAssigned}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '6px',
              marginBottom: '6px'
            }}>
              <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                <i className="fas fa-phone-volume" style={{ marginRight: '5px', color: '#fcd34d' }}></i>
                Used Numbers:
              </span>
              <span style={{ color: '#fcd34d', fontWeight: '600', fontSize: '13px' }}>{userProfile?.phoneNumbersUsed}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                <i className="fas fa-check-circle" style={{ marginRight: '5px', color: '#34d399' }}></i>
                Remaining Numbers:
              </span>
              <span style={{ color: '#34d399', fontWeight: '600', fontSize: '13px' }}>
                {userProfile ? (userProfile.phoneNumbersAssigned - userProfile.phoneNumbersUsed) : 0}
              </span>
            </div>
          </div>
          
          {/* Generate Input */}
          <div style={{ 
            backgroundColor: 'rgba(40, 44, 52, 0.8)', 
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
              <i className="fas fa-random" style={{ marginRight: '8px', color: '#7c83f7' }}></i>
              Generate Data
            </h3>
            
            <Form onSubmit={handleGenerateNumbers}>
              <Form.Group className="mb-3">
                <Form.Label>How many Data do you need?</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max={userProfile ? (userProfile.phoneNumbersAssigned - userProfile.phoneNumbersUsed) : 1}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  disabled={loading}
                  style={{
                    backgroundColor: 'rgba(30, 34, 40, 1)',
                    color: '#e9ebff',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                />
                <Form.Text style={{ color: '#a5d6ff' }}>
                  You can generate up to {userProfile ? (userProfile.phoneNumbersAssigned - userProfile.phoneNumbersUsed) : 0} numbers
                </Form.Text>
              </Form.Group>
              
              <Button 
                variant="primary" 
                type="submit" 
                disabled={
                  loading || 
                  (userProfile && userProfile.phoneNumbersAssigned - userProfile.phoneNumbersUsed <= 0) ||
                  !count
                }
                style={{
                  backgroundColor: '#7c83f7',
                  border: 'none',
                  width: '100%'
                }}
              >
                {loading ? 'Generating...' : 'Generate'}
              </Button>
            </Form>
          </div>
          
          {/* Output and Copy */}
          {phoneNumbers && (
            <div style={{ 
              backgroundColor: 'rgba(40, 44, 52, 0.8)', 
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <h3 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center' }}>
                  <i className="fas fa-list-alt" style={{ marginRight: '8px', color: '#7c83f7' }}></i>
                  Generated Data
                </h3>
                <div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleCopy}
                    style={{
                      backgroundColor: 'rgba(30, 34, 40, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#e9ebff',
                      marginRight: '8px'
                    }}
                  >
                    Copy
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleClear}
                    style={{
                      backgroundColor: 'rgba(30, 34, 40, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#e9ebff'
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div style={{ 
                backgroundColor: 'rgba(20, 24, 28, 1)', 
                padding: '10px',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.2)'
              }}>
                {phoneNumbers.split('\n').map((number, index) => (
                  <div key={index} style={{ 
                    padding: '3px 0',
                    borderBottom: index < phoneNumbers.split('\n').length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                  }}>
                    {number.replace(/\+/g, '')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      </div>
    </div>
  );
};

export default UserDashboard; 