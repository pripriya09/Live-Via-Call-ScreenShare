import React from 'react';

const Closed = () => {
  const handleOpenNewForm = () => {
    window.open('/form', '_blank');
  };

  return (
    <div className="closed-container">
      <h2>Form Submission Complete</h2>
      <p>The form has been submitted and the call has ended.</p>
      <p>Please open a new form to start again.</p>
      <button onClick={handleOpenNewForm}>Open New Form</button>
    </div>
  );
};

export default Closed;