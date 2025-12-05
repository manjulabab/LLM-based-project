import React, { useEffect, useState } from 'react';
import { listVendors, createVendor } from '../api';

export default function Vendors(){
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ vendor_name:'', email:'', contact_person:'', phone:''});
  
  useEffect(()=>{ load(); },[]);
  async function load()
  { 
    setVendors(await listVendors()); 
  }
  async function add()
  {
    if(!form.vendor_name || !form.email) return alert('Name and Email are required.');
    await createVendor(form);
    setForm({ vendor_name:'', email:'', contact_person:'', phone:''});
    load();
  }
  
  const inputStyle = { padding: '8px', marginRight: '10px', width: '180px' };

  return (
    <div>
      <h2>Vendor Master Data</h2>
      
      <div style={{ marginBottom: 20, padding: 15, border: '1px solid var(--border-color)', borderRadius: 6 }}>
        <h4>Add New Vendor</h4>
        <input style={inputStyle} placeholder="Vendor Name" value={form.vendor_name} onChange={e=>setForm({...form, vendor_name:e.target.value})} />
        <input style={inputStyle} placeholder="Contact Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        <input style={inputStyle} placeholder="Contact Person" value={form.contact_person} onChange={e=>setForm({...form, contact_person:e.target.value})} />
        <button onClick={add}>Add Vendor</button>
      </div>
      
      <h4>Existing Vendors</h4>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li style={{ display: 'flex', fontWeight: 'bold', padding: '8px 0', borderBottom: '2px solid #333' }}>
              <div style={{ width: '25%' }}>Name</div>
              <div style={{ width: '35%' }}>Email</div>
              <div style={{ width: '20%' }}>Contact</div>
          </li>
          {vendors.map(v => (
              <li key={v.id} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ width: '25%' }}>{v.vendor_name}</div>
                  <div style={{ width: '35%' }}>{v.email}</div>
                  <div style={{ width: '20%', color: 'var(--primary-color)' }}>{v.contact_person || 'N/A'}</div>
              </li>
          ))}
      </ul>
    </div>
  );
}