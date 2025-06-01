import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Check if a user is an admin
  const checkUserRole = async (userId) => {
    try {
      const response = await axios.post('/api/auth/check-role', { userId });
      return response.data.isAdmin;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Could not verify user role');
    }
  };

  // Login function
  const login = async (userId) => {
    try {
      const response = await axios.post('/api/auth/login', { userId });
      const userData = response.data;
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return userData;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Login failed');
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, checkUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}; 