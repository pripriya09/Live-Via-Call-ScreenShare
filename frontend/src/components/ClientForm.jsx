import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

const ClientForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    socket.emit('form-update', updatedFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    socket.emit('form-submit', formData);
    alert('Form submitted! Waiting for agent to accept the call.');
    window.open('/call', '_blank');
  };

  useEffect(() => {
    socket.on('connect', () => console.log('Socket connected in ClientForm:', socket.id));
    socket.on('form-update', (data) => {
      setFormData(data);
    });
    socket.on('clear-form', () => {
      setFormData({ name: '', email: '' });
    });
    socket.on('agent-form-submitted', () => {
      if (window.confirm('Agent has reviewed and submitted the form.')) {
        setFormData({ name: '', email: '' });
      }
    });
    socket.on('call-declined', () => {
      alert('The agent has declined the call. Please try again later.');
      setFormData({ name: '', email: '' });
    });
    return () => {
      socket.off('form-update');
      socket.off('clear-form');
      socket.off('agent-form-submitted');
      socket.off('call-declined');
      socket.off('connect');
    };
  }, []);

  return (
    <div className="form-container">
      <div className="form-content">
        <h3>Client Form</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Name:
            <input type="text" name="name" value={formData.name} onChange={handleChange} />
          </label>
          <br />
          <label>
            Email:
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </label>
          <br />
          <button type="submit" className="submit">
            <i className="fas fa-paper-plane mr-2"></i> Submit and Proceed to Call
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientForm;