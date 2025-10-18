'use client';

// Bridge page: exposes projects and folders from client-side persisted store
// The extension reads JSON from the #pp-bridge element's textContent.

import { useEffect, useState } from 'react';

export default function BridgeStatePage() {
  const [json, setJson] = useState('{}');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('paperpilot-storage');
      if (!raw) {
        setJson(JSON.stringify({ projects: [], folders: [] }));
        return;
      }
      const parsed = JSON.parse(raw);
      const state = parsed?.state || {};
      const projects = state.projects || [];
      const folders = state.folders || [];
      setJson(JSON.stringify({ projects, folders }));
    } catch {
      setJson(JSON.stringify({ projects: [], folders: [] }));
    }
  }, []);

  return (
    <pre id="pp-bridge" style={{ whiteSpace: 'pre-wrap' }}>{json}</pre>
  );
}


