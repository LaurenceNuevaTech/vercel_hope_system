import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './lib/store.jsx';
import SiteApp from './site/SiteApp.jsx';
import './styles/base.css';
import './styles/site.css';
import './styles/admin.css';
import './styles/mobile.css';

// Staff portal, phone simulator and flowcharts load on demand.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const MobileSim = lazy(() => import('./mobile/MobileSim.jsx'));
const Flows = lazy(() => import('./flows/Flows.jsx'));

const Loading = () => <div style={{ padding: 40, textAlign: 'center', color: '#667085' }}>Loading…</div>;

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StoreProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/mobile" element={<MobileSim />} />
          <Route path="/flows" element={<Flows />} />
          <Route path="/*" element={<SiteApp />} />
        </Routes>
      </Suspense>
    </StoreProvider>
  </BrowserRouter>,
);
