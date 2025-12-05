import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RfpCreate from './pages/RfpCreate';
import Vendors from './pages/Vendors';
import RfpDetail from './pages/RfpDetail';
import Compare from './pages/Compare';

function App(){
  const navStyle = { 
      marginBottom: 20, 
      paddingBottom: 10, 
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      gap: 15
  };
  return (
    <BrowserRouter>
      <div style={{ padding: 20 }}>
        <h1>ProcureAssist AI</h1>
        <nav style={navStyle}>
          <Link to="/">Home</Link>
          <Link to="/rfps/new">Create RFP</Link>
          <Link to="/vendors">Vendors</Link>
        </nav>
        <Routes>
          <Route path="/" element={<div>Welcome to the Procurement AI Tool. Use the navigation above to start.</div>} />
          <Route path="/rfps/new" element={<RfpCreate />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/rfps/:id" element={<RfpDetail />} />
          <Route path="/rfps/:id/compare" element={<Compare />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);