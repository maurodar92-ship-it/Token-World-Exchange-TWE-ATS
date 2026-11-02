import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './utils/languageContext.tsx';
import { Auth0MembershipProvider } from './utils/auth0MembershipContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <Auth0MembershipProvider>
        <App />
      </Auth0MembershipProvider>
    </LanguageProvider>
  </StrictMode>,
);

