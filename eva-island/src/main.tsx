import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EvaChat } from './EvaChat'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <EvaChat />
    </StrictMode>,
)
