import { useState, ChangeEvent, FormEvent } from 'react';
import { useMutation } from '@apollo/client';
import { LOGIN_USER } from '../utils/mutation';
import { Form, Button, Alert } from 'react-bootstrap';
import Auth from '../utils/auth';
import { LoginData, LoginInput } from '../utils/interfaces.js';

interface LoginFormProps {
  handleModalClose: () => void;
}

const LoginForm = ({ handleModalClose }: LoginFormProps): JSX.Element => {
  // Set initial form state
  const [userFormData, setUserFormData] = useState<LoginInput>({ email: '', password: '' });
  
  // Set state for form validation
  const [validated, setValidated] = useState<boolean>(false);
  
  // Set state for alert
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('Something went wrong with your login!');

  // Set up mutation
  const [login, { error }] = useMutation<LoginData, LoginInput>(LOGIN_USER);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setUserFormData({ ...userFormData, [name]: value });
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    // Check form validity
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
      setValidated(true);
      return;
    }

    // Set validated to true
    setValidated(true);

    try {
      // Execute the mutation with form data as variables
      const { data } = await login({
        variables: { ...userFormData }
      });

      // Check if we got data back
      if (!data || !data.login || !data.login.token) {
        throw new Error('Something went wrong!');
      }

      // Log the user in with the token
      Auth.login(data.login.token);
      
      // Close the modal
      handleModalClose();
    } catch (err) {
      console.error(err);
      // Set error message from the GraphQL error if available
      if (error && error.message) {
        setErrorMessage(error.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      }
      setShowAlert(true);
    }

    // Clear form values
    setUserFormData({
      email: '',
      password: '',
    });
  };

  return (
    <>
      <Form noValidate validated={validated} onSubmit={handleFormSubmit}>
        {/* Show alert if server response is bad */}
        <Alert dismissible onClose={() => setShowAlert(false)} show={showAlert} variant='danger'>
          {errorMessage}
        </Alert>

        <Form.Group className='mb-3'>
          <Form.Label htmlFor='email'>Email</Form.Label>
          <Form.Control
            type='text'
            placeholder='Your email'
            name='email'
            onChange={handleInputChange}
            value={userFormData.email}
            required
          />
          <Form.Control.Feedback type='invalid'>Email is required!</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className='mb-3'>
          <Form.Label htmlFor='password'>Password</Form.Label>
          <Form.Control
            type='password'
            placeholder='Your password'
            name='password'
            onChange={handleInputChange}
            value={userFormData.password}
            required
          />
          <Form.Control.Feedback type='invalid'>Password is required!</Form.Control.Feedback>
        </Form.Group>
        <Button
          disabled={!(userFormData.email && userFormData.password)}
          type='submit'
          variant='success'>
          Submit
        </Button>
      </Form>
    </>
  );
};

export default LoginForm;