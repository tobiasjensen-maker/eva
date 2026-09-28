import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryProvider } from './memory';
import { Provider } from '@economic/taco';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Provider settings={{ uniqueUserIdentifier: 'demo-user' }}>
            <MemoryProvider>
                <App />
            </MemoryProvider>
        </Provider>
    </StrictMode>
);
