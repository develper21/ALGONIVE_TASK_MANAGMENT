import { useNotification } from '../context/NotificationContext';

export const useToast = () => {
  const { addNotification } = useNotification();

  const success = (message) => {
    addNotification({ message, type: 'success' });
  };

  const error = (message) => {
    addNotification({ message, type: 'error' });
  };

  const warning = (message) => {
    addNotification({ message, type: 'warning' });
  };

  const info = (message) => {
    addNotification({ message, type: 'info' });
  };

  return { success, error, warning, info };
};

// Usage in components:
// const { success, error } = useToast();
// success('Operation completed successfully!');
// error('Something went wrong!');