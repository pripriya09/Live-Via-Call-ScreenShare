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
  console.log('Client form submitted:', formData);
  socket.emit('form-submit', formData);

  alert('Form submitted! ');

  // Open the /call page first
  window.open('/call', '_blank');

  // Wait 2 seconds to let the new tab initialize its socket
  setTimeout(() => {
    socket.emit('trigger-start-call');
  }, 2000); // You can increase this if needed
};


  useEffect(() => {
    socket.on('form-update', (data) => {
      setFormData(data);
    });

    socket.on('clear-form', () => {
      setFormData({ name: '', email: '' }); // Clear form when call ends
    });

    return () => {
      socket.off('form-update');
      socket.off('clear-form');
    };
  }, []);

  return (
    <div className="form-container">
        <div className='form-conten'>
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
        <button type="submit">Submit and Proceed to Call</button>
      </form>
      </div>
    </div>
    
  );
};

export default ClientForm;