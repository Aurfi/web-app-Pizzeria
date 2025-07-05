import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AdminApp from './AdminApp'
import './styles/admin.css'
import { brandingService } from '../services/branding'
import axios from 'axios'

// Initialize branding and services for admin
async function initializeAdmin() {
  try {
    // Set API base URL
    axios.defaults.baseURL = 'http://localhost:3001'
    
    // Initialize branding to get Mario's Pizzeria branding
    await brandingService.initialize()
    
    // Render the admin app
    ReactDOM.createRoot(document.getElementById('admin-root')!).render(
      <React.StrictMode>
        <BrowserRouter basename="/admin">
          <AdminApp />
        </BrowserRouter>
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('Failed to initialize admin app:', error)
    
    // Still render the app even if branding fails
    ReactDOM.createRoot(document.getElementById('admin-root')!).render(
      <React.StrictMode>
        <BrowserRouter basename="/admin">
          <AdminApp />
        </BrowserRouter>
      </React.StrictMode>,
    )
  }
}

// Initialize the admin app
initializeAdmin()