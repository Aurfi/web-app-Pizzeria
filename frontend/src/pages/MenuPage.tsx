import React from 'react'
import { Plus, Search, Filter, ChefHat } from 'lucide-react'

function MenuPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Gestion du menu</h2>
        <button className="btn btn-primary">
          <Plus size={16} />
          Ajouter un article
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher des articles..."
                className="form-input pl-10"
              />
            </div>
            <button className="btn btn-secondary">
              <Filter size={16} />
              Filtrer
            </button>
          </div>
        </div>
        <div className="card-content">
          <div className="text-center py-12 text-gray-500">
            <ChefHat size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">La gestion du menu arrive bientôt</h3>
            <p>Cet écran permettra d’ajouter, modifier et organiser les articles du menu.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MenuPage
