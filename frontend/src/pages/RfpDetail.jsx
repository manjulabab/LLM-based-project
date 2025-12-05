import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRfp, sendRfp } from '../api';
import RfpForm from '../components/RfpForm';

export default function RfpDetail(){
  const { id } = useParams();
  const [rfp, setRfp] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(()=>{ load(); },[]);

  async function load(){
    const rfpRes = await getRfp(id);
    const vendorRes = await (await fetch('http://localhost:4000/api/v1/vendors')).json();
    setRfp(rfpRes);
    setVendors(vendorRes);
  }

  async function handleSend(){
    if (selected.length === 0) return alert('Please select at least one vendor.');
    setSending(true);
    await sendRfp(id, selected, null);
    setSending(false);
    alert(`RFP Sent to ${selected.length} vendor(s)! (Check backend logs for email status and check in spam)`);
  }

  if(!rfp) return <div style={{ textAlign: 'center', padding: 50 }}>Loading RFP Details...</div>;

  return (
    <div style={{ display:'flex', gap: 30, backgroundColor: 'var(--card-background)', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ flex: 2 }}>
        <h2>{rfp.title}</h2>
        <p><strong>Original Request:</strong> {rfp.description}</p>

        <div style={{ border: '1px dashed var(--border-color)', padding: 15, borderRadius: 4 }}>
            <h4>AI Extracted Structured Data (Editable)</h4>
            <RfpForm structured={rfp.structured} onChange={(newStruct) => setRfp({...rfp, structured: newStruct})} />
        </div>

        <div style={{ marginTop: 25 }}>
          <h4>Actions</h4>
          <Link to={`/rfps/${id}/compare`} style={{ padding: '8px 15px', backgroundColor: 'var(--success-color)', color: 'white', borderRadius: 4, textDecoration: 'none' }}>
            Go to Proposal Comparison
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, padding: 15, borderLeft: '1px solid var(--border-color)' }}>
        <h4> Send RFP to Vendors ({selected.length} selected)</h4>
        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 15 }}>
          {vendors.map(v => (
            <div key={v.id} style={{ padding: '5px 0' }}>
              <label>
                <input 
                  type="checkbox" 
                  onChange={e => {
                    if(e.target.checked) setSelected(prev => [...prev, v.id]); 
                    else setSelected(prev => prev.filter(x=>x!==v.id));
                  }}
                  style={{ marginRight: 5 }}
                /> 
                <strong>{v.vendor_name}</strong> <span style={{ color: '#666', fontSize: '0.9em' }}>({v.email})</span>
              </label>
            </div>
          ))}
        </div>
        
        <button onClick={handleSend} disabled={sending || selected.length === 0} style={{ width: '100%' }}>
          {sending ? 'Sending...' : `Send RFP to ${selected.length} Vendor(s)`}
        </button>
      </div>
    </div>
  );
}