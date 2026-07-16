import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Register from '../Register';

// Mock the React Router hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock the Auth Context
const mockLogin = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

// Mock the API service
jest.mock('../../services/api', () => ({
  register: jest.fn(),
}));
const api = require('../../services/api');

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders registration form correctly', () => {
    render(<Register />);
    
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    // Check if role select exists
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  test('submits registration form successfully and redirects', async () => {
    // Setup the mock to resolve successfully
    api.register.mockResolvedValueOnce({
      data: { token: 'fake-jwt-token', user: { id: 2, email: 'newuser@example.com' } }
    });

    render(<Register />);
    
    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'securepassword' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'STUDENT' } });
    
    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    // Verify loading state
    expect(screen.getByText('Creating Account…')).toBeInTheDocument();

    // Wait for the async actions to complete
    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        fullName: 'New Student',
        email: 'newuser@example.com',
        password: 'securepassword',
        role: 'STUDENT'
      });
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('displays error message on failed registration', async () => {
    // Setup the mock to reject with an error
    api.register.mockRejectedValueOnce({
      response: { data: { message: 'Email already in use' } }
    });

    render(<Register />);
    
    fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'User' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'exist@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
    
    // Ensure we did not navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
