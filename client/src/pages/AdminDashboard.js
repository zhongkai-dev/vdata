import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Spinner, Table, Modal, Row, Col, InputGroup, ProgressBar } from 'react-bootstrap';
import { getUsers, createUser, uploadPhoneNumbers, getPhoneNumbersCount, assignPhoneNumbersToUser, clearAllPhoneNumbers, clearAllUserAssignments, bulkCreateUsers, bulkAssignToAllUsers, clearUsedPhoneNumbers, clearAssignedPhoneNumbers, clearTotalPhoneNumbers, deleteUser, deleteMultipleUsers, exportUnusedPhoneNumbers } from '../utils/api';

const AdminDashboard = ({ section = 'dashboard' }) => {
  // State for users
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [paginatedUsers, setPaginatedUsers] = useState([]);
  
  // State for phone numbers
  const [phoneNumbersCount, setPhoneNumbersCount] = useState(0); // Available numbers
  const [totalPhoneNumbers, setTotalPhoneNumbers] = useState(0); // Total numbers
  const [assignedPhoneNumbers, setAssignedPhoneNumbers] = useState(0); // Assigned numbers
  const [usedPhoneNumbers, setUsedPhoneNumbers] = useState(0); // Used numbers
  const [totalUsers, setTotalUsers] = useState(0); // Total users (non-admin)
  const [phoneNumbersLoading, setPhoneNumbersLoading] = useState(true);
  
  // State for forms
  const [newUser, setNewUser] = useState({ userId: '', name: '' });
  const [phoneNumbersFile, setPhoneNumbersFile] = useState(null);
  
  // State for assignment
  const [selectedUser, setSelectedUser] = useState('');
  const [assignCount, setAssignCount] = useState('');
  const [assignToAllUsers, setAssignToAllUsers] = useState(false);
  
  // State for UI
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  
  // State for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  
  // State for bulk user upload
  const [userUploadFile, setUserUploadFile] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  
  // State for progress tracking during bulk operations
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // New state for selecting users to delete
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectAllUsers, setSelectAllUsers] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Fetch users and phone numbers count
  useEffect(() => {
    fetchUsers();
    fetchPhoneNumbersCount();
  }, []);
  
  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.userId.includes(term)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);
  
  // Update pagination effect
  useEffect(() => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    setPaginatedUsers(filteredUsers.slice(indexOfFirstUser, indexOfLastUser));
  }, [currentPage, filteredUsers, usersPerPage]);
  
  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  // Reset current page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      setError('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };
  
  const fetchPhoneNumbersCount = async () => {
    try {
      setPhoneNumbersLoading(true);
      const data = await getPhoneNumbersCount();
      
      // Log the received data to help with debugging
      console.log('Phone numbers data received:', data);
      
      // Set the values from the API
      setPhoneNumbersCount(data.availablePhoneNumbers); // Should be 200,000
      setTotalPhoneNumbers(data.totalPhoneNumbers);     // Should be 220,000
      setAssignedPhoneNumbers(data.assignedPhoneNumbers); // Should be 20,000
      setUsedPhoneNumbers(data.usedPhoneNumbers);       // Should be 1,000
      setTotalUsers(data.userCount);                    // Should be 20
    } catch (error) {
      console.error('Phone numbers count error:', error);
      if (error.response) {
        // Server responded with an error
        setError(`Failed to load phone numbers count: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        setError('Failed to load phone numbers count: No response from server. Check if the server is running.');
      } else {
        // Error in request setup
        setError(`Failed to load phone numbers count: ${error.message}`);
      }
      
      // Set default values when there's an error
      setPhoneNumbersCount(0);
      setTotalPhoneNumbers(0);
      setAssignedPhoneNumbers(0);
      setUsedPhoneNumbers(0);
      setTotalUsers(0);
    } finally {
      setPhoneNumbersLoading(false);
    }
  };
  
  // Show confirmation modal
  const showConfirmationModal = (title, message, action) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };
  
  // Handle confirmation
  const handleConfirm = async () => {
    setShowConfirmModal(false);
    if (confirmAction) {
      await confirmAction();
    }
  };
  
  // Handle clear all phone numbers
  const handleClearAllPhoneNumbers = () => {
    showConfirmationModal(
      'Clear All Phone Numbers',
      'Are you sure you want to delete ALL phone numbers from the system? This action cannot be undone.',
      async () => {
        try {
          setLoading(true);
          setError('');
          setSuccess('');
          
          const response = await clearAllPhoneNumbers();
          
          await fetchPhoneNumbersCount();
          setSuccess(response.message || 'All phone numbers have been cleared successfully');
        } catch (error) {
          setError(error.response?.data?.message || 'Failed to clear phone numbers');
        } finally {
          setLoading(false);
        }
      }
    );
  };
  
  // Handle clear used phone numbers
  const handleClearUsedPhoneNumbers = () => {
    showConfirmationModal(
      'Clear Used Phone Numbers',
      'Are you sure you want to reset all used phone numbers? This will mark all used numbers as available again.',
      async () => {
        try {
          setLoading(true);
          setError('');
          setSuccess('');
          
          const response = await clearUsedPhoneNumbers();
          
          await fetchPhoneNumbersCount();
          setSuccess(response.message || 'Used phone numbers have been cleared successfully');
        } catch (error) {
          setError(error.response?.data?.message || 'Failed to clear used phone numbers');
        } finally {
          setLoading(false);
        }
      }
    );
  };
  
  // Handle clear assigned phone numbers
  const handleClearAssignedPhoneNumbers = () => {
    showConfirmationModal(
      'Clear Assigned Phone Numbers',
      'Are you sure you want to clear all assigned phone numbers? This will remove all assignments but keep the numbers in the system.',
      async () => {
        try {
          setLoading(true);
          setError('');
          setSuccess('');
          
          const response = await clearAssignedPhoneNumbers();
          
          await fetchPhoneNumbersCount();
          setSuccess(response.message || 'Assigned phone numbers have been cleared successfully');
        } catch (error) {
          setError(error.response?.data?.message || 'Failed to clear assigned phone numbers');
        } finally {
          setLoading(false);
        }
      }
    );
  };
  
  // Handle clear total phone numbers
  const handleClearTotalPhoneNumbers = () => {
    showConfirmationModal(
      'Clear Total Phone Numbers',
      'Are you sure you want to reset the total phone numbers? This will clear all numbers from the system.',
      async () => {
        try {
          setLoading(true);
          setError('');
          setSuccess('');
          
          const response = await clearTotalPhoneNumbers();
          
          await fetchPhoneNumbersCount();
          setSuccess(response.message || 'Total phone numbers have been cleared successfully');
        } catch (error) {
          setError(error.response?.data?.message || 'Failed to clear total phone numbers');
        } finally {
          setLoading(false);
        }
      }
    );
  };
  
  // Handle clear all user assignments
  const handleClearAllUserAssignments = () => {
    showConfirmationModal(
      'Clear All User Assignments',
      'Are you sure you want to reset ALL user assignments? Users will keep their accounts but all phone number assignments will be cleared.',
      async () => {
        try {
          setLoading(true);
          setError('');
          setSuccess('');
          
          const response = await clearAllUserAssignments();
          
          // Refresh data
          await fetchUsers();
          setSuccess(response.message || 'All user assignments have been cleared successfully');
        } catch (error) {
          setError(error.response?.data?.message || 'Failed to clear user assignments');
        } finally {
          setLoading(false);
        }
      }
    );
  };
  
  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newUser.userId || newUser.userId.length !== 6 || !/^\d+$/.test(newUser.userId)) {
      setError('Please enter a valid 6-digit user ID');
      return;
    }
    
    if (!newUser.name) {
      setError('Please enter a name');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Always set phoneNumbersAssigned to 0 when creating a user
      await createUser({...newUser, phoneNumbersAssigned: 0});
      
      // Reset form and refresh users
      setNewUser({ userId: '', name: '' });
      await fetchUsers();
      
      setSuccess('User created successfully');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle phone number upload
  const handlePhoneNumberUpload = async (e) => {
    e.preventDefault();
    
    if (!phoneNumbersFile) {
      setError('Please upload a file');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Read file content
      const text = await phoneNumbersFile.text();
      const numbers = text.split(/[\r\n]+/).filter(n => n.trim());
      
      // For very large files, process in batches
      if (numbers.length > 5000) {
        setSuccess('Processing large file in batches...');
        
        // Process in batches of 5000
        const batches = [];
        for (let i = 0; i < numbers.length; i += 5000) {
          batches.push(numbers.slice(i, i + 5000));
        }
        
        let totalAdded = 0;
        let totalSkipped = 0;
        
        // Upload each batch
        for (let i = 0; i < batches.length; i++) {
          try {
            setSuccess(`Uploading batch ${i+1}/${batches.length}...`);
            const response = await uploadPhoneNumbers(batches[i]);
            
            // Extract numbers from message
            const addedMatch = response.message.match(/(\d+) phone numbers added/);
            const skippedMatch = response.duplicates?.match(/(\d+) duplicates/);
            
            if (addedMatch) totalAdded += parseInt(addedMatch[1]);
            if (skippedMatch) totalSkipped += parseInt(skippedMatch[1]);
          } catch (error) {
            setError(`Error uploading batch ${i+1}: ${error.message}`);
          }
        }
        
        // Reset form and refresh count
        setPhoneNumbersFile(null);
        await fetchPhoneNumbersCount();
        
        setSuccess(`Upload complete: ${totalAdded} phone numbers added, ${totalSkipped} duplicates skipped`);
        setLoading(false);
        return;
      }
      
      if (numbers.length === 0) {
        setError('No valid phone numbers found');
        setLoading(false);
        return;
      }
      
      const response = await uploadPhoneNumbers(numbers);
      
      // Reset form and refresh count
      setPhoneNumbersFile(null);
      await fetchPhoneNumbersCount();
      
      setSuccess(response.message);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload phone numbers');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle file upload
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setPhoneNumbersFile(e.target.files[0]);
    }
  };
  
  // Handle assign phone numbers
  const handleAssignPhoneNumbers = async (e) => {
    e.preventDefault();

    if (!assignToAllUsers && !selectedUser) {
      setError('Please select a user or choose "Assign to All Users"');
      return;
    }
    
    const numCount = parseInt(assignCount) || 0;
    if (!assignCount || numCount <= 0) {
      setError('Please enter a valid number');
      return;
    }
    
    if (numCount > phoneNumbersCount && !assignToAllUsers) {
      setError(`Only ${phoneNumbersCount} phone numbers available for this user.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgressMessage('');
    setProgressCurrent(0);
    setProgressTotal(0);
    let progressInterval = null; // For simulated progress

    try {
      if (assignToAllUsers) {
        const regularUsers = users.filter(user => !user.isAdmin);
        if (regularUsers.length === 0) {
          setError('No regular users to assign numbers to.');
          setLoading(false);
          return;
        }

        const totalNumbersPotentiallyNeeded = regularUsers.length * numCount;
        if (totalNumbersPotentiallyNeeded > phoneNumbersCount) {
          setError(`Not enough phone numbers for all users. Need ${totalNumbersPotentiallyNeeded}, have ${phoneNumbersCount}.`);
          setLoading(false);
          return;
        }
        
        showConfirmationModal(
          'Bulk Assignment to All Users',
          `Assign ${numCount} phone numbers to EACH of the ${regularUsers.length} non-admin users? This requires ${totalNumbersPotentiallyNeeded} numbers. The process might take a moment.`,
          async () => {
            setLoading(true);
            setProgressTotal(regularUsers.length);
            setProgressCurrent(0); // Start at 0
            setProgressMessage(`Initiating bulk assignment to ${regularUsers.length} users...`);
            
            // Simulate progress
            let simulatedProgress = 0;
            progressInterval = setInterval(() => {
              simulatedProgress++;
              if (simulatedProgress <= regularUsers.length) {
                setProgressCurrent(simulatedProgress);
              }
              // Don't let simulated progress exceed total or finish prematurely
              if (simulatedProgress >= regularUsers.length -1 ) clearInterval(progressInterval); // Stop near end
            }, 800 / Math.max(1, regularUsers.length/10) ); // Adjust timing based on user count

            try {
              const response = await bulkAssignToAllUsers(numCount);
              clearInterval(progressInterval); // Stop simulation on actual completion
              setProgressCurrent(response.totalUsersProcessed || regularUsers.length); // Snap to actual or full
              await fetchUsers(); 
              await fetchPhoneNumbersCount(); 
              setSuccess(response.message || 'Bulk assignment process completed.');
              setProgressMessage('Bulk operation complete!');
            } catch (error) {
              clearInterval(progressInterval);
              console.error('Bulk assignment to all users failed:', error.response?.data?.message || error.message);
              setError(error.response?.data?.message || 'Bulk assignment failed.');
              setProgressMessage('Bulk operation failed.');
            } finally {
              setLoading(false);
              // setProgressTotal(0); // Optional: reset total for next time if you want bar to disappear
            }
          }
        );
        return; 
      } else {
        // Single user assignment (remains the same)
        const response = await assignPhoneNumbersToUser(selectedUser, numCount);
        await fetchUsers();
        await fetchPhoneNumbersCount();
        setSuccess(response.message);
        setLoading(false); // Set loading false for single assignment
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to assign phone numbers');
      setLoading(false); // Ensure loading is false on outer catch
      if(progressInterval) clearInterval(progressInterval);
    } finally {
        // setLoading(false) is handled within branches or here if not in modal
        // This setLoading is a fallback, might be redundant if all paths set it.
        // if (!assignToAllUsers) setLoading(false); 
    }
  };
  
  // Show user details modal
  const showUserDetails = (user) => {
    setModalUser(user);
    setShowModal(true);
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle file selection for bulk user upload
  const handleUserFileChange = (e) => {
    if (e.target.files[0]) {
      setUserUploadFile(e.target.files[0]);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('user-dropdown');
      const customSelect = document.querySelector('.custom-select');
      
      if (dropdown && customSelect && 
          !dropdown.contains(event.target) && 
          !customSelect.contains(event.target)) {
        dropdown.classList.remove('show');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle bulk user upload
  const handleBulkUserUpload = async (e) => {
    e.preventDefault();
    
    if (!userUploadFile) {
      setError('Please upload a file');
      return;
    }
    
    // Validate file extension
    const fileExt = userUploadFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExt)) {
      setError('Please upload a CSV, XLS, or XLSX file');
      return;
    }
    
    try {
      setBulkUploadLoading(true);
      setError('');
      setSuccess('');
      
      const response = await bulkCreateUsers(userUploadFile);
      
      // Reset form and refresh users
      setUserUploadFile(null);
      await fetchUsers();
      
      setSuccess(`${response.message} (${response.totalInFile - response.skippedExisting} added, ${response.skippedExisting} skipped)`);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload users');
      console.error('Bulk upload error:', error);
    } finally {
      setBulkUploadLoading(false);
    }
  };
  
  // Handle delete user
  const handleDeleteUser = (userId) => {
    showConfirmationModal(
      'Delete User',
      `Are you sure you want to delete user with ID ${userId}? This action cannot be undone.`,
      async () => {
        try {
          setDeleteLoading(true);
          setError('');
          setSuccess('');
          
          const response = await deleteUser(userId);
          
          // Remove user from state
          setUsers(users.filter(user => user.userId !== userId));
          setFilteredUsers(filteredUsers.filter(user => user.userId !== userId));
          
          // Reset selected user IDs
          setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
          
          await fetchPhoneNumbersCount();
          setSuccess(response.message || `User ${userId} has been deleted successfully`);
        } catch (error) {
          setError(error.response?.data?.message || 'Failed to delete user');
        } finally {
          setDeleteLoading(false);
        }
      }
    );
  };
  
  // Handle bulk delete users
  const handleBulkDeleteUsers = () => {
    if (selectedUserIds.length === 0) {
      setError('No users selected for deletion');
      return;
    }
    
    showConfirmationModal(
      'Delete Multiple Users',
      `Are you sure you want to delete ${selectedUserIds.length} users? This action cannot be undone.`,
      async () => {
        try {
          setDeleteLoading(true);
          setError('');
          setSuccess('');
          
          const response = await deleteMultipleUsers(selectedUserIds);
          
          // Remove users from state
          setUsers(users.filter(user => !selectedUserIds.includes(user.userId)));
          setFilteredUsers(filteredUsers.filter(user => !selectedUserIds.includes(user.userId)));
          
          // Reset selected user IDs
          setSelectedUserIds([]);
          setSelectAllUsers(false);
          
          await fetchPhoneNumbersCount();
          setSuccess(response.message || `${response.deletedCount} users have been deleted successfully`);
        } catch (error) {
          setError(error.response?.data?.message || 'Failed to delete users');
        } finally {
          setDeleteLoading(false);
        }
      }
    );
  };
  
  // Handle checkbox change for individual users
  const handleUserCheckboxChange = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };
  
  // Handle select all users checkbox
  const handleSelectAllUsers = () => {
    if (selectAllUsers) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(user => user.userId));
    }
    setSelectAllUsers(!selectAllUsers);
  };
  
  // Update selectedUserIds when filteredUsers changes
  useEffect(() => {
    if (selectAllUsers) {
      setSelectedUserIds(filteredUsers.map(user => user.userId));
    }
  }, [filteredUsers, selectAllUsers]);
  
  // Export unused phone numbers
  const handleExportUnusedNumbers = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await exportUnusedPhoneNumbers();
      
      if (response && response.phoneNumbers && response.phoneNumbers.length > 0) {
        // Create and trigger download
        const dataStr = response.phoneNumbers.join('\n');
        const blob = new Blob([dataStr], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'unused_phone_numbers.txt';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setSuccess(`Successfully exported ${response.count} unused phone numbers`);
      } else {
        setError('No unused phone numbers found');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to export unused phone numbers');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      {/* Video Background - Optimized for performance */}
      <video 
        autoPlay 
        loop 
        muted 
        className="bg-video" 
        playsInline
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: '-1' }}
        onError={(e) => {
          // If video file fails to load, apply a fallback background
          e.target.style.display = 'none';
          document.body.style.background = 'linear-gradient(135deg, #1f2937, #111827)';
        }}
      >
        <source src="/video/bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Animated Tab Navigation - Removed as it's redundant with the header menu */}
      
      {error && (
        <Alert variant="danger" className="glass-container py-2 px-3 mt-5">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="glass-container py-2 px-3 mt-5">
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}
      
      {/* Dashboard & Upload Section */}
      <div className={`admin-section ${section === 'dashboard' ? 'active' : ''}`} style={{ marginTop: '80px' }}>
        <Row className="mb-4">
          {/* Card 1: Total Numbers */}
          <Col md={6} lg={2} xl className="mb-3">
            <div className="svg-stat-card" style={{ background: 'rgba(255, 207, 89, 0.1)', borderColor: 'rgba(255, 207, 89, 0.3)' }}>
              <div className="svg-icon" style={{ color: '#ffcf59' }}>
                <i className="fas fa-database fa-2x"></i>
              </div>
              <div className="stat-content">
                <div className="stat-title">Total Numbers</div>
                <div className="stat-value">
                  {phoneNumbersLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    totalPhoneNumbers.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </Col>
          
          {/* Card 2: Assigned Numbers */}
          <Col md={6} lg={2} xl className="mb-3">
            <div className="svg-stat-card" style={{ background: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.3)' }}>
              <div className="svg-icon" style={{ color: '#f87171' }}>
                <i className="fas fa-layer-group fa-2x"></i>
              </div>
              <div className="stat-content">
                <div className="stat-title">Assigned Numbers</div>
                <div className="stat-value">
                  {phoneNumbersLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    assignedPhoneNumbers.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </Col>
          
          {/* Card 3: Available Numbers */}
          <Col md={6} lg={2} xl className="mb-3">
            <div className="svg-stat-card" style={{ background: 'rgba(88, 181, 255, 0.1)', borderColor: 'rgba(88, 181, 255, 0.3)' }}>
              <div className="svg-icon" style={{ color: '#58b5ff' }}>
                <i className="fas fa-phone-alt fa-2x"></i>
              </div>
              <div className="stat-content">
                <div className="stat-title">Available Numbers</div>
                <div className="stat-value">
                  {phoneNumbersLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    phoneNumbersCount.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </Col>

          {/* Card 4: Used Numbers */}
          <Col md={6} lg={2} xl className="mb-3">
            <div className="svg-stat-card" style={{ background: 'rgba(74, 220, 178, 0.1)', borderColor: 'rgba(74, 220, 178, 0.3)' }}>
              <div className="svg-icon" style={{ color: '#4adcb2' }}>
                <i className="fas fa-phone-volume fa-2x"></i>
              </div>
              <div className="stat-content">
                <div className="stat-title">Used Numbers</div>
                <div className="stat-value">
                  {phoneNumbersLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    usedPhoneNumbers.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </Col>
          
          {/* Card 5: Users */}
          <Col md={6} lg={2} xl className="mb-3">
            <div className="svg-stat-card" style={{ background: 'rgba(124, 131, 247, 0.1)', borderColor: 'rgba(124, 131, 247, 0.3)' }}>
              <div className="svg-icon" style={{ color: '#7c83f7' }}>
                <i className="fas fa-users fa-2x"></i>
              </div>
              <div className="stat-content">
                <div className="stat-title">Users</div>
                <div className="stat-value">
                  {phoneNumbersLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    totalUsers.toLocaleString()
                  )}
                </div>
              </div>
            </div>
          </Col>
        </Row>
        
        {/* Clear Buttons Section */}
        <Row className="mb-4">
          <Col>
            <div className="glass-container p-3">
              <h5 className="mb-3"><i className="fas fa-broom me-2"></i>Quick Actions</h5>
              <div className="d-flex flex-wrap gap-2 justify-content-between">
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  onClick={handleClearTotalPhoneNumbers}
                  disabled={loading || totalPhoneNumbers === 0}
                  style={{ backgroundColor: 'rgba(255, 207, 89, 0.1)', borderColor: 'rgba(255, 207, 89, 0.3)', color: '#ffcf59' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 207, 89, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 207, 89, 0.1)'}
                >
                  <i className="fas fa-database me-2"></i> Clear Total Numbers
                </Button>
                
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  onClick={handleClearAssignedPhoneNumbers}
                  disabled={loading || assignedPhoneNumbers === 0}
                  style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.3)', color: '#f87171' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.1)'}
                >
                  <i className="fas fa-layer-group me-2"></i> Clear Assigned Numbers
                </Button>
                
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  onClick={handleClearUsedPhoneNumbers}
                  disabled={loading || usedPhoneNumbers === 0}
                  style={{ backgroundColor: 'rgba(74, 220, 178, 0.1)', borderColor: 'rgba(74, 220, 178, 0.3)', color: '#4adcb2' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 220, 178, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 220, 178, 0.1)'}
                >
                  <i className="fas fa-phone-volume me-2"></i> Clear Used Numbers
                </Button>
                
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  onClick={handleClearAllPhoneNumbers}
                  disabled={loading || totalPhoneNumbers === 0}
                  style={{ backgroundColor: 'rgba(124, 131, 247, 0.1)', borderColor: 'rgba(124, 131, 247, 0.3)', color: '#7c83f7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(124, 131, 247, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(124, 131, 247, 0.1)'}
                >
                  <i className="fas fa-trash-alt me-2"></i> Clear All Numbers
                </Button>
              </div>
            </div>
          </Col>
        </Row>
        
        {/* Upload Phone Numbers Section */}
        <div className="upload-section" style={{ backgroundColor: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3>
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            Upload Phone Numbers
          </h3>
          
          <Card className="modern-card">
            <Card.Body>
              <Form onSubmit={handlePhoneNumberUpload} className="modern-form">
                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="fas fa-file-upload me-2"></i>
                    Upload phone numbers from a file
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="form-control-file"
                  />
                  <Form.Text className="text-light mt-2">
                    <i className="fas fa-info-circle me-1"></i>
                    Upload a .txt file with one phone number per line.
                  </Form.Text>
                </Form.Group>
                
                <div className="mb-3 d-flex flex-wrap gap-2">
                  <Button 
                    type="button"
                    className="btn-modern-primary"
                    onClick={handlePhoneNumberUpload}
                    disabled={loading || !phoneNumbersFile}
                    aria-label="Upload Phone Numbers"
                  >
                    <i className="fas fa-cloud-upload-alt me-2"></i>
                    {loading ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" /> Uploading...
                      </>
                    ) : 'Upload Numbers'}
                  </Button>
                  
                  <Button 
                    type="button"
                    className="btn-modern-secondary"
                    onClick={() => document.getElementById('phone-numbers-input').click()}
                    disabled={loading}
                    aria-label="Select File"
                  >
                    <i className="fas fa-file-alt me-2"></i> Select File
                  </Button>

                  <Button 
                    type="button"
                    className="btn-modern-info"
                    onClick={handleExportUnusedNumbers}
                    disabled={loading || phoneNumbersCount === 0}
                    aria-label="Export Unused Numbers"
                  >
                    <i className="fas fa-download me-2"></i> Export Unused Numbers
                  </Button>
                  
                  <Button 
                    type="button"
                    className="btn-modern-danger"
                    onClick={handleClearAllPhoneNumbers}
                    disabled={loading}
                    aria-label="Clear All Numbers"
                  >
                    <i className="fas fa-trash-alt me-2"></i> Clear All Numbers
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>
      
      {/* User Management Section - without user list */}
      <div className={`admin-section ${section === 'users' ? 'active' : ''}`} style={{ marginTop: '80px' }}>
        <div className="admin-section-heading">
          <i className="fas fa-user-plus me-2"></i>
          Create New User
        </div>
        
        <Card className="modern-card">
          <Card.Body>
            <Form onSubmit={handleCreateUser} className="modern-form">
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>User ID (6 digits)</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter 6-digit user ID"
                      value={newUser.userId}
                      onChange={(e) => setNewUser({ ...newUser, userId: e.target.value })}
                      maxLength={6}
                      disabled={loading}
                    />
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter user name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      disabled={loading}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Button 
                className="btn-modern-primary"
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" /> Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus me-2"></i> Create User
                  </>
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
        
        <div className="admin-section-heading mt-4">
          <i className="fas fa-file-upload me-2"></i>
          Bulk Upload Users
        </div>
        
        <Card className="modern-card">
          <Card.Body>
            <Form onSubmit={handleBulkUserUpload} className="modern-form">
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-users me-2"></i>
                  Upload multiple users from Excel or CSV
                </Form.Label>
                <Form.Text className="d-block mb-2">
                  File must have user ID in column A and name in column B. User ID must be 6 digits.
                </Form.Text>
                <Form.Control
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleUserFileChange}
                  disabled={bulkUploadLoading}
                  className="form-control-file"
                />
              </Form.Group>
              
              <Button 
                className="btn-modern-primary w-100" 
                type="submit" 
                disabled={bulkUploadLoading || !userUploadFile}
              >
                {bulkUploadLoading ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" /> Uploading Users...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus me-2"></i> Bulk Add Users
                  </>
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
      
      {/* NEW User List Section */}
      <div className={`admin-section ${section === 'userlist' ? 'active' : ''}`} style={{ marginTop: '80px' }}>
        <div className="admin-section-heading">
          <i className="fas fa-list me-2"></i>
          User List
        </div>
        
        <Card className="modern-card mb-4 no-hover">
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="fas fa-search me-2"></i>
                Search Users
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search by name or user ID..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  disabled={loading}
                />
                {searchTerm && (
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="fas fa-times"></i>
                  </Button>
                )}
              </InputGroup>
              <Form.Text className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                {filteredUsers.length === 0 ? 'No users found' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
              </Form.Text>
            </Form.Group>
            
            {/* Add bulk delete button */}
            {filteredUsers.length > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="d-flex align-items-center">
                  <Form.Check
                    type="checkbox"
                    id="select-all-users"
                    checked={selectAllUsers && filteredUsers.length > 0}
                    onChange={handleSelectAllUsers}
                    disabled={filteredUsers.length === 0 || deleteLoading}
                    className="me-2"
                    label="Select All"
                  />
                </div>
                
                <Button
                  className="btn-modern-danger"
                  size="sm"
                  disabled={selectedUserIds.length === 0 || deleteLoading}
                  onClick={handleBulkDeleteUsers}
                >
                  {deleteLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" /> Deleting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash me-2"></i> Delete Selected ({selectedUserIds.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
        
        <Card className="modern-card no-hover">
          <Card.Body>
            {usersLoading ? (
              <div className="text-center p-5">
                <Spinner animation="border" variant="light" />
                <p className="mt-2">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center p-4">
                <i className="fas fa-users fa-3x mb-3 text-muted"></i>
                <p>No users found</p>
                <p className="text-muted">Create a user to get started</p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table className="modern-table" hover>
                    <thead>
                      <tr>
                        <th className="text-center" style={{width: '40px'}}>
                          <Form.Check
                            type="checkbox"
                            checked={selectAllUsers && filteredUsers.length > 0}
                            onChange={handleSelectAllUsers}
                            disabled={filteredUsers.length === 0 || deleteLoading}
                          />
                        </th>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Phone Numbers Assigned</th>
                        <th>Phone Numbers Used</th>
                        <th>Remaining</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map(user => (
                        <tr key={user.userId}>
                          <td className="text-center">
                            <Form.Check
                              type="checkbox"
                              checked={selectedUserIds.includes(user.userId)}
                              onChange={() => handleUserCheckboxChange(user.userId)}
                              disabled={deleteLoading}
                            />
                          </td>
                          <td>{user.userId}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="user-avatar me-2" style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: user.isAdmin ? '#8A6FE8' : '#4adcb2',
                                color: '#fff',
                                fontWeight: 'bold'
                              }}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              {user.name} {user.isAdmin ? ' (Admin)' : ''}
                            </div>
                          </td>
                          <td>{user.phoneNumbersAssigned}</td>
                          <td>{user.phoneNumbersUsed}</td>
                          <td>{user.phoneNumbersAssigned - user.phoneNumbersUsed}</td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-2">
                              <Button 
                                className="btn-modern-secondary btn-sm"
                                onClick={() => showUserDetails(user)}
                              >
                                <i className="fas fa-info-circle"></i>
                              </Button>
                              
                              {!user.isAdmin && (
                                <Button 
                                  className="btn-modern-danger btn-sm"
                                  onClick={() => handleDeleteUser(user.userId)}
                                  disabled={deleteLoading}
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                
                {/* Fixed Pagination - Horizontal Layout */}
                {filteredUsers.length > usersPerPage && (
                  <div className="d-flex justify-content-center mt-4">
                    <div className="pagination-controls d-flex align-items-center">
                      <Button 
                        className="btn-modern-secondary me-2"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <i className="fas fa-chevron-left"></i> Previous
                      </Button>
                      
                      <span className="mx-3 d-flex align-items-center">
                        Page {currentPage} of {Math.ceil(filteredUsers.length / usersPerPage)}
                      </span>
                      
                      <Button 
                        className="btn-modern-secondary"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === Math.ceil(filteredUsers.length / usersPerPage)}
                      >
                        Next <i className="fas fa-chevron-right"></i>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      </div>
      
      {/* Assign Numbers Section */}
      <div className={`admin-section ${section === 'assign' ? 'active' : ''}`} style={{ marginTop: '80px' }}>
        <div className="admin-section-heading">
          <i className="fas fa-share-alt me-2"></i>
          Assign Phone Numbers to User
        </div>
        
        <Card className="modern-card mb-4">
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="fas fa-search me-2"></i>
                Search Users
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search by name or user ID..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  disabled={loading}
                />
                {searchTerm && (
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="fas fa-times"></i>
                  </Button>
                )}
              </InputGroup>
              <Form.Text className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                {filteredUsers.length === 0 ? 'No users found' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>
        
        <Card className="modern-card">
          <Card.Body>
            <Form onSubmit={handleAssignPhoneNumbers} className="modern-form">
              <Form.Group className="mb-4">
                <Form.Check
                  type="checkbox"
                  label="Assign to All Users (bulk assignment)"
                  id="assign-to-all"
                  checked={assignToAllUsers}
                  onChange={(e) => setAssignToAllUsers(e.target.checked)}
                  disabled={loading || users.length === 0}
                  className="mb-2"
                />
                <Form.Text className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  This will distribute numbers evenly among all non-admin users
                </Form.Text>
              </Form.Group>
              
              {!assignToAllUsers && (
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Select User</Form.Label>
                      
                      <div className="custom-select-container">
                        <div 
                          className="custom-select" 
                          onClick={() => document.getElementById('user-dropdown').classList.toggle('show')}
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '0.375rem',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#a5a9ff'
                          }}
                        >
                          <span>
                            {selectedUser 
                              ? filteredUsers.find(u => u.userId === selectedUser)?.name + 
                                ` (${filteredUsers.find(u => u.userId === selectedUser)?.userId})`
                              : 'Select a user'}
                          </span>
                          <i className="fas fa-chevron-down"></i>
                        </div>
                        
                        <div 
                          id="user-dropdown" 
                          className="custom-select-dropdown" 
                          style={{ 
                            position: 'absolute',
                            width: '100%',
                            maxHeight: '250px',
                            overflowY: 'auto',
                            backgroundColor: 'rgba(30, 41, 59, 0.3)',
                            backdropFilter: 'blur(15px)',
                            WebkitBackdropFilter: 'blur(15px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '0.375rem',
                            marginTop: '5px',
                            zIndex: 100,
                            display: 'none',
                            color: '#a5a9ff'
                          }}
                        >
                          <div 
                            className="custom-select-option"
                            onClick={() => {
                              setSelectedUser('');
                              document.getElementById('user-dropdown').classList.remove('show');
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#8A6FE8'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(138, 111, 232, 0.15)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            Select a user
                          </div>
                          
                          {filteredUsers.map(user => (
                            <div 
                              key={user.userId}
                              className="custom-select-option"
                              onClick={() => {
                                setSelectedUser(user.userId);
                                document.getElementById('user-dropdown').classList.remove('show');
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: selectedUser === user.userId ? 'rgba(138, 111, 232, 0.2)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#8A6FE8'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedUser !== user.userId) {
                                  e.target.style.backgroundColor = 'rgba(138, 111, 232, 0.15)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedUser !== user.userId) {
                                  e.target.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <div 
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(138, 111, 232, 0.6)', 
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: '8px',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {user.name.charAt(0)}
                              </div>
                              <div style={{ flexGrow: 1 }}>
                                <div style={{ color: '#8A6FE8' }}>{user.name}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7, color: '#BCA8FF' }}>ID: {user.userId}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Hidden original select for form submission */}
                      <Form.Select
                        className="d-none"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        disabled={loading || filteredUsers.length === 0 || assignToAllUsers}
                      >
                        <option value="">Select a user</option>
                        {filteredUsers.map(user => (
                          <option key={user.userId} value={user.userId}>
                            {user.name} ({user.userId})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Number of Phone Numbers</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        max={phoneNumbersCount}
                        value={assignCount}
                        onChange={(e) => setAssignCount(e.target.value)}
                        disabled={loading}
                      />
                      <Form.Text>
                        <i className="fas fa-info-circle me-1"></i>
                        Available: {phoneNumbersCount} phone numbers
                        {assignToAllUsers && <div className="mt-1">Each user will receive {assignCount ? parseInt(assignCount) : 0} number{assignCount !== '1' ? 's' : ''} (Total: {users.filter(u => !u.isAdmin).length > 0 ? (parseInt(assignCount) || 0) * users.filter(u => !u.isAdmin).length : 0} numbers needed)</div>}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              )}
              
              {assignToAllUsers && (
                <Form.Group className="mb-3">
                  <Form.Label>Total Phone Numbers to Distribute</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max={phoneNumbersCount}
                    value={assignCount}
                    onChange={(e) => setAssignCount(e.target.value)}
                    disabled={loading}
                  />
                  <Form.Text>
                    <i className="fas fa-info-circle me-1"></i>
                    Each user will receive {assignCount ? parseInt(assignCount) : 0} number{assignCount !== '1' ? 's' : ''}
                    {users.filter(u => !u.isAdmin).length > 0 && ` (Total: ${(parseInt(assignCount) || 0) * users.filter(u => !u.isAdmin).length} numbers needed)`}
                  </Form.Text>
                </Form.Group>
              )}
              
              <div className="d-flex justify-content-between mt-3">
                <Button 
                  className="btn-modern-primary" 
                  type="submit" 
                  disabled={loading || phoneNumbersCount === 0 || (filteredUsers.length === 0 && !assignToAllUsers)}
                >
                  {loading && !progressMessage ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" /> Assigning...
                    </>
                  ) : loading && progressMessage ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" /> Working...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-share-alt me-2"></i> 
                      {assignToAllUsers ? 'Assign to All Users' : 'Assign Phone Numbers'}
                    </>
                  )}
                </Button>
                
                <Button 
                  className="btn-modern-danger" 
                  type="button"
                  onClick={handleClearAllUserAssignments}
                  disabled={loading || users.length === 0}
                >
                  <i className="fas fa-eraser me-2"></i> Clear All Assignments
                </Button>
              </div>

              {/* Progress Display for Bulk Assign */}
              {loading && assignToAllUsers && progressTotal > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-light">{progressMessage}</p>
                  <ProgressBar 
                    now={(progressCurrent / progressTotal) * 100} 
                    label={`${Math.round((progressCurrent / progressTotal) * 100)}%`} 
                    className="modern-progressbar"
                  />
                  <p className="mt-1 text-light text-center">{progressCurrent} / {progressTotal} users processed</p>
                </div>
              )}
            </Form>
          </Card.Body>
        </Card>
      </div>
      
      {/* User Details Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        centered
        size="sm"
        className="transparent-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalUser && (
            <div className="user-details-simple">
              <div className="user-name">{modalUser.name}</div>
              
              <div className="user-info-item">
                <span className="info-label">User ID</span>
                <span className="info-value">{modalUser.userId}</span>
              </div>
              
              <div className="user-info-item">
                <span className="info-label">Assigned</span>
                <span className="info-value">{modalUser.phoneNumbersAssigned}</span>
              </div>
              
              <div className="user-info-item">
                <span className="info-label">Used</span>
                <span className="info-value">{modalUser.phoneNumbersUsed}</span>
              </div>
              
              <div className="user-info-item">
                <span className="info-label">Remaining</span>
                <span className="info-value">{modalUser.phoneNumbersAssigned - modalUser.phoneNumbersUsed}</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" className="btn-modern-secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Confirmation Modal */}
      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
        size="sm"
        className="transparent-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>{confirmTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-danger mb-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Warning: This action cannot be undone!
          </div>
          <p>{confirmMessage}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" className="btn-modern-secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" className="btn-modern-danger" onClick={handleConfirm}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AdminDashboard; 