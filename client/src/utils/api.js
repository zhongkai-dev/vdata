import axiosInstance from './axiosConfig';

// Create axios instance with auth token
const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return {
    Authorization: user ? `Bearer ${user.token}` : '',
  };
};

// Admin API functions
export const createUser = async (userData) => {
  const response = await axiosInstance.post('/api/users', userData, { headers: getAuthHeaders() });
  return response.data;
};

export const getUsers = async () => {
  const response = await axiosInstance.get('/api/users', { headers: getAuthHeaders() });
  return response.data;
};

// New function to delete a single user
export const deleteUser = async (userId) => {
  const response = await axiosInstance.delete(`/api/admin/delete-user/${userId}`, { headers: getAuthHeaders() });
  return response.data;
};

// New function to delete multiple users
export const deleteMultipleUsers = async (userIds) => {
  const response = await axiosInstance.post('/api/admin/delete-users', { userIds }, { headers: getAuthHeaders() });
  return response.data;
};

export const uploadPhoneNumbers = async (numbers) => {
  const response = await axiosInstance.post('/api/admin/upload-numbers', { numbers }, { headers: getAuthHeaders() });
  return response.data;
};

export const getPhoneNumbersCount = async () => {
  try {
    const response = await axiosInstance.get('/api/admin/phone-numbers/count', { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error('Error fetching phone numbers count:', error);
    throw new Error('Could not fetch phone numbers count');
  }
};

export const assignPhoneNumbersToUser = async (userId, count) => {
  const response = await axiosInstance.post('/api/admin/assign-numbers', { userId, count }, { headers: getAuthHeaders() });
  return response.data;
};

export const clearAllPhoneNumbers = async () => {
  const response = await axiosInstance.delete('/api/admin/clear-numbers', { headers: getAuthHeaders() });
  return response.data;
};

export const clearUsedPhoneNumbers = async () => {
  const response = await axiosInstance.delete('/api/admin/clear-used-numbers', { headers: getAuthHeaders() });
  return response.data;
};

export const clearAssignedPhoneNumbers = async () => {
  const response = await axiosInstance.delete('/api/admin/clear-assigned-numbers', { headers: getAuthHeaders() });
  return response.data;
};

export const clearTotalPhoneNumbers = async () => {
  const response = await axiosInstance.delete('/api/admin/clear-total-numbers', { headers: getAuthHeaders() });
  return response.data;
};

export const clearAllUserAssignments = async () => {
  const response = await axiosInstance.delete('/api/admin/clear-assignments', { headers: getAuthHeaders() });
  return response.data;
};

export const bulkCreateUsers = async (file) => {
  // Create form data for file upload
  const formData = new FormData();
  formData.append('file', file);
  
  // Custom headers for multipart form data
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...getAuthHeaders()
    }
  };
  
  const response = await axiosInstance.post('/api/admin/bulk-create-users', formData, config);
  return response.data;
};

// User API functions
export const getUserProfile = async () => {
  const response = await axiosInstance.get('/api/users/profile', { headers: getAuthHeaders() });
  return response.data;
};

export const generatePhoneNumbers = async (count) => {
  try {
    const requestData = { count };
    const response = await axiosInstance.post('/api/users/generate-numbers', requestData, { headers: getAuthHeaders() });
    
    // Remove plus signs from the phone numbers if they exist
    if (response.data.phoneNumbers) {
      response.data.phoneNumbers = response.data.phoneNumbers.map(number => number.replace(/\+/g, ''));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error generating phone numbers:', error);
    throw error;
  }
};

export const exportUnusedPhoneNumbers = async () => {
  try {
    const response = await axiosInstance.get('/api/admin/export-unused-numbers', { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error('Error exporting unused phone numbers:', error);
    throw error;
  }
};

export const bulkAssignToAllUsers = async (countPerUser) => {
  const response = await axiosInstance.post('/api/admin/bulk-assign-to-all', { countPerUser }, { headers: getAuthHeaders() });
  return response.data;
}; 