import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:3000');

const CallSummary = () => {
  const [summaryData, setSummaryData] = useState({ formData: { name: '', email: '' }, agentName: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Debug: Log socket connection
    socket.on('connect', () => console.log('Socket connected in CallSummary:', socket.id));

    // Check local storage for summary data on mount
    const storedSummary = localStorage.getItem('callSummary');
    if (storedSummary) {
      console.log('Loaded from local storage:', JSON.parse(storedSummary));
      setSummaryData(JSON.parse(storedSummary));
    }

    // Listen for call-summary event
    socket.on('call-summary', (data) => {
      console.log('Received call-summary:', data); // Debug log
      // Ensure formData is properly structured
      const sanitizedData = {
        formData: {
          name: data.formData?.name || '',
          email: data.formData?.email || '',
        },
        agentName: data.agentName || '',
      };
      setSummaryData(sanitizedData);
      localStorage.setItem('callSummary', JSON.stringify(sanitizedData)); // Update local storage
    });

    return () => {
      socket.off('call-summary');
      socket.off('connect');
    };
  }, []);

  const handleBackToForm = () => {
    localStorage.removeItem('callSummary'); // Clear local storage on navigation
    navigate('/form');
  };

  return (
    <div className="summary-container">
      <h2>Call Summary</h2>
      <h3>Submitted Form Details</h3>
      <p><strong>Name:</strong> {summaryData.formData.name || 'N/A'}</p>
      <p><strong>Email:</strong> {summaryData.formData.email || 'N/A'}</p>
      <h3>Agent Details</h3>
      <p><strong>Agent Name:</strong> {summaryData.agentName || 'N/A'}</p>
      <button onClick={handleBackToForm}>Back to Form</button>
    </div>
  );
};

export default CallSummary;