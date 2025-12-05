import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { evaluate, inboundSample, getRfp } from '../api';

export default function Compare()
{
  const { id } = useParams();

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [simulationError, setSimulationError] = useState(null); // Added state for simulation errors

  useEffect(()=>{ loadComparison(); }, []);

  async function loadComparison(){

    setLoading(true);
    setSimulationError(null); // Clear simulation errors on reload

    try {

        // Attempt evaluation first (fetches results if already run)

        const comparisonData = await evaluate(id);

        setResult(comparisonData);

    } catch (error) {

        console.error("Comparison failed:", error);

        // If evaluation fails (e.g., no proposals), still fetch RFP detail

        try {

            const rfpDetail = await getRfp(id);

            setResult({ 

                message: 'Evaluation failed or no proposals found.',

                rfp: rfpDetail,

                proposals: [] 

            });

        } catch(e) {

             setResult({ message: 'Evaluation failed. Check server logs.' });

        }

    }

    setLoading(false);

  }
  async function simulateResponse(){

    setSimulationError(null);

    const samplePayload = { 

        from:"your_mail_id",

        subject: `Re: RFP: Office laptops and monitors [RFPID:${id}]`, 

        body: "Hi, we can supply 20 Dell Latitude 5520 laptops (16GB RAM) at $1200 each (total $24,000) and 15 27-inch monitors at $250 each (total $3,750). Delivery: 25 days. Warranty: 12 months. Payment terms: Net 30. Total $27,750 USD.",

        message_id: `<msg${Date.now()}@fasttech>`

    };

    try {

        await inboundSample(samplePayload);

        alert('Simulated inbound email processed by backend! Reloading comparison...');

        await loadComparison();

    } catch (error) {

         const errorMessage = error.message || 'Unknown simulation error.';

         console.error("Simulation failed:", errorMessage);

         setSimulationError(errorMessage); // Display error in UI

    }

  }

  if(loading) return <div style={{ textAlign: 'center', padding: 50 }}>Analyzing Proposals...</div>;

  if(!result || !result.rfp) return <div style={{ textAlign: 'center', padding: 50 }}>Could not load RFP or results.</div>;

  if(result.proposals.length === 0) return (

    <div style={{ padding: 20 }}>

        <h2>Proposal Comparison</h2>

        <p>No proposals received yet for RFP **#{id}**. You need to send the RFP to a vendor first, then simulate their reply.</p>

        {simulationError && (

            <div style={{ color: 'red', backgroundColor: '#fdd', padding: 10, borderRadius: 5, marginBottom: 15 }}>

                **Simulation Error:** {simulationError}

            </div>

        )}

        <button onClick={simulateResponse} style={{ backgroundColor: 'var(--success-color)' }}>

            Simulate a Vendor Response (mail_id)

        </button>
    </div>
  );

  const proposals = result.proposals;

  const ranked = result.ranked || [];

  const bestVendorId = ranked?.[0]?.vendor_id;
  return (

    <div>

      <h2>Proposal Comparison & Evaluation</h2>
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>

          {/* AI Recommendation Card */}

          <div style={{ flex: 1, backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: 20, borderRadius: 8 }}>

              <h4>⭐ AI Recommendation</h4>

              <p><strong>Recommended Vendor:</strong> <span style={{ color: 'var(--primary-color)' }}>{ranked?.[0]?.vendor_name || 'N/A'}</span></p>

              <p><strong>Score:</strong> <span style={{ fontWeight: 'bold' }}>{ranked?.[0]?.score || 'N/A'}%</span></p>

              <p>{result.explanation_text || 'AI explanation pending...'}</p>

          </div>

          {/* RFP Summary */}

          <div style={{ flex: 1, backgroundColor: 'var(--card-background)', border: '1px solid var(--border-color)', padding: 20, borderRadius: 8 }}>

              <h4>RFP Requirements</h4>

              <pre style={{ margin: 0, fontSize: '0.85em', maxHeight: 200, overflow: 'auto' }}>

                {JSON.stringify(result.rfp.structured, null, 2)}

              </pre>

          </div>

      </div>

      <h4>Comparative Table</h4>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--card-background)' }}>

        <thead>

          <tr style={{ backgroundColor: '#e9ecef' }}>

            <th style={{ padding: 10, border: '1px solid #ddd', textAlign: 'left' }}>Vendor Name</th>

            <th style={{ padding: 10, border: '1px solid #ddd' }}>Total Price</th>

            <th style={{ padding: 10, border: '1px solid #ddd' }}>Delivery (Days)</th>

            <th style={{ padding: 10, border: '1px solid #ddd' }}>Payment Terms</th>

            <th style={{ padding: 10, border: '1px solid #ddd' }}>AI Score</th>

          </tr>

        </thead>

        <tbody>

          {proposals.map((p, idx) => {

            const isRecommended = p.vendorId === bestVendorId;

            const data = p.structured_json;

            return (

              <tr key={idx} style={{ backgroundColor: isRecommended ? '#d4edda' : 'white' }}>

                <td style={{ padding: 10, border: '1px solid #ddd', fontWeight: isRecommended ? 'bold' : 'normal' }}>

                  {p.Vendor?.vendor_name || 'N/A'} {isRecommended && ' (BEST MATCH)'}

                </td>

                <td style={{ padding: 10, border: '1px solid #ddd', textAlign: 'right' }}>

                   {data?.currency || p.currency} {data?.grand_total?.toLocaleString() || p.total_price?.toLocaleString() || 'N/A'}

                </td>

                <td style={{ padding: 10, border: '1px solid #ddd', textAlign: 'center' }}>{data?.shipping_days || p.delivery_days || 'N/A'}</td>

                <td style={{ padding: 10, border: '1px solid #ddd' }}>{data?.payment_terms || p.payment_terms || 'N/A'}</td>

                <td style={{ padding: 10, border: '1px solid #ddd', textAlign: 'center', color: 'var(--primary-color)' }}>

                  {p.score ? `${p.score}%` : 'Pending'}

                </td>

              </tr>

            );

          })}

        </tbody>

      </table>

      <div style={{ marginTop: 20 }}>

          {simulationError && (

              <p style={{ color: 'red', marginBottom: 10 }}>🛑 **Simulation failed:** {simulationError}</p>

          )}

          <button onClick={simulateResponse} style={{ backgroundColor: 'var(--success-color)' }}>

              Simulate Another Vendor Response

          </button>

      </div>

      <h4 style={{ marginTop: 30 }}>Raw AI Comparison Output</h4>

      <pre style={{ maxHeight: 300, overflow: 'auto', backgroundColor: '#f5f5f5', padding: 10, borderRadius: 4 }}>

        {JSON.stringify(result, null, 2)}

      </pre>

    </div>

  );

}