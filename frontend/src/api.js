const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api/v1';

async function fetcher(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        // Attempt to read the error body for better debugging
        let errorDetails = await res.text();
        try {
            errorDetails = JSON.parse(errorDetails).error || errorDetails;
        } catch (e) {
            // ignore JSON parse error
        }
        throw new Error(`API call failed: ${res.statusText}. Details: ${errorDetails}`);
    }
    return res.json();
}

export async function createRfp(text) {
    return fetcher(`${BASE}/rfps`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ text }) 
    });
}
export async function listVendors() { 
    return fetcher(`${BASE}/vendors`); 
}
export async function createVendor(data) { 
    return fetcher(`${BASE}/vendors`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(data) 
    });
}
export async function sendRfp(id, vendorIds, template) {
    return fetcher(`${BASE}/rfps/${id}/send`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ vendorIds, emailTemplate: template }) 
    });
}
export async function getRfp(id) { 
    return fetcher(`${BASE}/rfps/${id}`);
}
export async function evaluate(id) {
    return fetcher(`${BASE}/rfps/${id}/evaluate`, { method: 'POST' }); 
}
export async function inboundSample(payload) {
    // Calls the new email route
    return fetcher(`${BASE}/email/inbound`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
}