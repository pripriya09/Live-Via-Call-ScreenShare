import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ClientCall from './components/ClientCall';
import ClientForm from './components/ClientForm';
import AgentView from './components/AgentView';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <h1>P2P Video Call and Form Sharing</h1>
        <Routes>
          <Route path="/" element={<Navigate to="/form" />} />
          <Route path="/call" element={<ClientCall />} />
          <Route path="/form" element={<ClientForm />} />
          <Route path="/agent" element={<AgentView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;