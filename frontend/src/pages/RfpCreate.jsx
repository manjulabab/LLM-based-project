import React, { useState } from 'react';
import { createRfp } from '../api';
import { useNavigate } from 'react-router-dom';

export default function RfpCreate(){
  const initialText = 'I need to procure 20 laptops (16GB RAM) and 15 27-inch monitors. Budget $50,000 total. Delivery within 30 days. Payment terms should be Net 30, and we need at least 1 year warranty.';
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleCreate(){
    setLoading(true);
    const data = await createRfp(text);
    setLoading(false);
    if(data?.id) navigate(`/rfps/${data.id}`);
    else alert('Failed to create RFP. Check the logic');
  }

  return (
    <div>
      <h2>Create Request For Proposal</h2>
      <p>Describe your procurement needs in a single paragraph. The AI will extract the structured data.</p>
      <textarea 
        rows={8} 
        style={{ width:'100%', minHeight: '150px' }} 
        value={text} 
        onChange={e=>setText(e.target.value)} 
        placeholder={initialText}
      />
      <div style={{ marginTop: 15 }}>
        <button 
          onClick={handleCreate} 
          disabled={loading} 
          style={{ padding: '10px 20px', fontSize: '1.1em' }}
        >
          {loading ? 'Parsing Request...' : 'Parse & Create Structured RFP'}
        </button>
      </div>
    </div>
  );
}