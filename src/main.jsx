import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'

// StrictMode алынып тасталды: drei <Html> екі рет монтаждауда қате береді
createRoot(document.getElementById('root')).render(<App />)
