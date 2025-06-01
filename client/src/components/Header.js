import React, { useContext } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const isAdmin = user && user.isAdmin;
  
  // Function to get user's first name initial
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };
  
  return (
    <Navbar className="modern-navbar" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to={isAdmin ? '/admin/dashboard' : '/dashboard'}>
          <i className="fas fa-phone-square-alt me-2" style={{ fontSize: '1.4rem', color: 'var(--primary-color)' }}></i>
          <span style={{ fontWeight: '700', letterSpacing: '0.5px' }}>Phone Generator</span>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          {user ? (
            <>
              {isAdmin ? (
                // Admin Menu
                <Nav className="header-nav">
                  <Nav.Link 
                    as={Link} 
                    to="/admin/dashboard" 
                    className={`admin-menu-item ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}
                  >
                    <i className="fas fa-tachometer-alt me-2"></i>
                    Dashboard & Upload
                  </Nav.Link>
                  
                  <Nav.Link 
                    as={Link} 
                    to="/admin/users" 
                    className={`admin-menu-item ${location.pathname === '/admin/users' ? 'active' : ''}`}
                  >
                    <i className="fas fa-user-plus me-2"></i>
                    User Management
                  </Nav.Link>

                  <Nav.Link 
                    as={Link} 
                    to="/admin/userlist" 
                    className={`admin-menu-item ${location.pathname === '/admin/userlist' ? 'active' : ''}`}
                  >
                    <i className="fas fa-list me-2"></i>
                    User List
                  </Nav.Link>
                  
                  <Nav.Link 
                    as={Link} 
                    to="/admin/assign" 
                    className={`admin-menu-item ${location.pathname === '/admin/assign' ? 'active' : ''}`}
                  >
                    <i className="fas fa-tasks me-2"></i>
                    Assign Numbers
                  </Nav.Link>
                </Nav>
              ) : (
                // Regular User Links
                <Nav className="me-auto">
                  <Nav.Link as={Link} to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
                    <i className="fas fa-tachometer-alt me-2"></i>
                    Dashboard
                  </Nav.Link>
                  
                  <Nav.Link as={Link} to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
                    <i className="fas fa-user me-2"></i>
                    Profile
                  </Nav.Link>
                </Nav>
              )}
              
              {/* User Info and Logout */}
              <div className="user-info ms-auto d-flex align-items-center">
                <div className="user-icon">{getInitial(user.name)}</div>
                <span className="d-none d-md-inline me-3">{user.name}</span>
                <Nav.Link onClick={logout}>
                  <i className="fas fa-sign-out-alt me-1"></i>
                  <span className="d-none d-sm-inline">Logout</span>
                </Nav.Link>
              </div>
            </>
          ) : (
            <Nav className="ms-auto">
              {/* All login links removed as requested */}
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header; 