import { useNotification } from './NotificationContext';

// Inside your AuthProvider component
const { addNotification } = useNotification();

const signup = async (userData) => {
  try {
    // Your signup logic here
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Signup failed');
    }
    
    addNotification({
      message: 'Account created successfully! Please sign in.',
      type: 'success'
    });
    
    return data;
  } catch (error) {
    addNotification({
      message: error.message || 'Failed to create account',
      type: 'error'
    });
    throw error;
  }
};

const signin = async (credentials) => {
  try {
    // Your signin logic here
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Signin failed');
    }
    
    addNotification({
      message: 'Successfully signed in!',
      type: 'success'
    });
    
    return data;
  } catch (error) {
    addNotification({
      message: error.message || 'Failed to sign in',
      type: 'error'
    });
    throw error;
  }
};