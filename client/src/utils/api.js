import axios from 'axios';

// Create axios instance with auth token
const createAuthAxios = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  const authAxios = axios.create({
    headers: {
      'Content-Type': 'application/json',
      Authorization: user ? `Bearer ${user.token}` : '',
    },
  });
  
  return authAxios;
};

// Admin API functions
export const createUser = async (userData) => {
  const authAxios = createAuthAxios();
  const response = await authAxios.post('/api/users', userData);
  return response.data;
};

export const getUsers = async () => {
  const authAxios = createAuthAxios();
  const response = await authAxios.get('/api/users');
  return response.data;
};

// New function to delete a single user
export const deleteUser = async (userId) => {
  const authAxios = createAuthAxios();
  const response = await authAxios.delete(`/api/admin/delete-user/${userId}`);
  return response.data;
};

// New function to delete multiple users
export const deleteMultipleUsers = async (userIds) => {
  const authAxios = createAuthAxios();
  const response = await authAxios.post('/api/admin/delete-users', { userIds });
  return response.data;
};

export const uploadPhoneNumbers = async (numbers) => {
  const authAxios = createAuthAxios();
  const response = await authAxios.post('/api/admin/upload-numbers', { numbers });
  return response.data;
};

export const getPhoneNumbersCount = async () => {
  try {
    const authAxios = createAuthAxios();
    const response = await authAxios.get('/api/admin/phone-numbers/count');
    return response.data;
  } catch (error) {
    console.error('Error fetching phone numbers count:', error);
    throw new Error('Could not fetch phone numbers count');
  }
};

export const assignPhoneNumbersToUser = async (userId, count) => {
  const authAxios = createAuthAxios();
  const response = await authAxios.post('/api/admin/assign-numbers', { userId, count });
  return response.data;
};

export const clearAllPhoneNumbers = async () => {
  const authAxios = createAuthAxios();
  const response = await authAxios.delete('/api/admin/clear-numbers');
  return response.data;
};

export const clearUsedPhoneNumbers = async () => {
  const authAxios = createAuthAxios();
  const response = await authAxios.delete('/api/admin/clear-used-numbers');
  return response.data;
};

export const clearAssignedPhoneNumbers = async () => {
  const authAxios = createAuthAxios();
  const response = await authAxios.delete('/api/admin/clear-assigned-numbers');
  return response.data;
};

export const clearTotalPhoneNumbers = async () => {
  const authAxios = createAuthAxios();
  const response = await authAxios.delete('/api/admin/clear-total-numbers');
  return response.data;
};

export const clearAllUserAssignments = async () => {
  const authAxios = createAuthAxios();
  const response = await authAxios.delete('/api/admin/clear-assignments');
  return response.data;
};

export const bulkCreateUsers = async (file) => {
  const authAxios = createAuthAxios();
  
  // Create form data for file upload
  const formData = new FormData();
  formData.append('file', file);
  
  // Custom headers for multipart form data
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: authAxios.defaults.headers.Authorization
    }
  };
  
  const response = await axios.post('/api/admin/bulk-create-users', formData, config);
  return response.data;
};

// User API functions
export const getUserProfile = async () => {
  const authAxios = createAuthAxios();
  const response = await authAxios.get('/api/users/profile');
  return response.data;
};

export const generatePhoneNumbers = async (count) => {
  try {
    const authAxios = createAuthAxios();
    
    const requestData = { count };
    const response = await authAxios.post('/api/users/generate-numbers', requestData);
    
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
    const authAxios = createAuthAxios();
    const response = await authAxios.get('/api/admin/export-unused-numbers');
    return response.data;
  } catch (error) {
    console.error('Error exporting unused phone numbers:', error);
    throw error;
  }
};

export const bulkAssignToAllUsers = async (countPerUser) => {
  const authAxios = createAuthAxios();
  const response = await authAxios.post('/api/admin/bulk-assign-to-all', { countPerUser });
  return response.data;
}; 