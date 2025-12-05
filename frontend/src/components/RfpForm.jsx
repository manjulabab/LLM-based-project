import React from 'react';

export default function RfpForm({ structured, onChange }) {
  if(!structured) return <div>No structured data</div>;

  const updateItem = (idx, field, value) => {
    const copy = {...structured}; 
    copy.items[idx] = { ...copy.items[idx], [field]: value };
    onChange(copy);
  };
  
  const updateField = (field, value) => {
      onChange({ ...structured, [field]: value });
  };

  const inputStyle = { width: '90px', marginRight: '5px', border: '1px solid #ccc', padding: '5px', borderRadius: '3px' };

  return (
    <div style={{ fontSize: '0.95em' }}>
      <div style={{ display: 'flex', gap: 15, marginBottom: 15, padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <label>Budget: <input style={inputStyle} type="number" value={structured.total_budget || ''} onChange={e => updateField('total_budget', parseFloat(e.target.value) || null)} /></label>
          <label>Days: <input style={inputStyle} type="number" value={structured.delivery_days || ''} onChange={e => updateField('delivery_days', parseInt(e.target.value, 10) || null)} /></label>
          <label>Payment: <input style={inputStyle} type="text" value={structured.payment_terms || ''} onChange={e => updateField('payment_terms', e.target.value)} /></label>
          <label>Warranty: <input style={inputStyle} type="number" value={structured.warranty_months || ''} onChange={e => updateField('warranty_months', parseInt(e.target.value, 10) || null)} /></label>
      </div>

      <h4>Itemized Requirements</h4>
      {structured.items?.map((it, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, padding: 5, borderBottom: '1px dotted #ddd' }}>
          <input 
            style={{ ...inputStyle, width: '150px' }} 
            value={it.name || ''} 
            onChange={e => updateItem(idx, 'name', e.target.value)} 
            placeholder="Item Name"
          />
          <input 
            style={inputStyle} 
            type="number" 
            value={it.qty || ''} 
            onChange={e => updateItem(idx, 'qty', parseInt(e.target.value, 10) || null)} 
            placeholder="Qty"
          />
          <span style={{ color: '#666' }}>units of {it.unit}</span>
          <span style={{ marginLeft: 10, fontSize: '0.85em', color: '#007bff' }}>Specs: {JSON.stringify(it.specs)}</span>
        </div>
      ))}
    </div>
  );
}