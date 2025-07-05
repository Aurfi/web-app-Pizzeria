import React from 'react'
import { Settings } from 'lucide-react'

function SettingsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Paramètres</h2>
      </div>

      <div className="card">
        <div className="card-content">
          <div className="text-center py-12 text-gray-500">
            <Settings size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Les paramètres arrivent bientôt</h3>
            <p>Cet écran permettra de configurer les horaires, les zones de livraison et plus encore.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
