import React from 'react'
import { ClipboardList } from 'lucide-react'

function OrdersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Gestion des commandes</h2>
      </div>

      <div className="card">
        <div className="card-content">
          <div className="text-center py-12 text-gray-500">
            <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">La gestion des commandes arrive bientôt</h3>
            <p>Cet écran affichera les commandes en direct et permettra de mettre à jour leur statut.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrdersPage
