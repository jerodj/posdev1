import React, { useState } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { Search, Filter, Star, Leaf, Flame, Wine, Coffee } from 'lucide-react';
import toast from 'react-hot-toast';

const categoryIcons = {
  'ChefHat': Coffee,
  'Utensils': Coffee,
  'Cake': Coffee,
  'Beer': Wine,
  'Wine': Wine,
  'Martini': Wine,
  'Coffee': Coffee
};

export function MenuView() {
  const { menuItems, categories, addToCart, loading } = usePOSStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    alcoholic: false,
    featured: false
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesFilters = 
      (!filters.vegetarian || item.is_vegetarian) &&
      (!filters.vegan || item.is_vegan) &&
      (!filters.glutenFree || item.is_gluten_free) &&
      (!filters.alcoholic || item.is_alcoholic) &&
      (!filters.featured || item.is_featured);
    
    return matchesSearch && matchesCategory && matchesFilters;
  });

  const handleAddToCart = (item) => {
    try {
      addToCart(item);
      toast.success(`${item.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(`Failed to add ${item.name} to cart: ${error.message}`);
    }
  };

  if (loading) {
    return <div>Loading POS System...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold transition-all ${
              showFilters 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={loading}
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
            <div className="flex flex-wrap gap-3">
              {Object.entries(filters).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setFilters(prev => ({ ...prev, [key]: !value }))}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    value
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {key === 'glutenFree' ? 'Gluten Free' : 
                   key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center px-6 py-3 rounded-2xl font-semibold transition-all transform hover:scale-105 ${
              !selectedCategory
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={loading}
          >
            All Items
          </button>
          {categories.map(category => {
            const IconComponent = categoryIcons[category.icon] || Coffee;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-6 py-3 rounded-2xl font-semibold transition-all transform hover:scale-105 ${
                  selectedCategory === category.id
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{
                  background: selectedCategory === category.id 
                    ? `linear-gradient(135deg, ${category.color}, ${category.color}dd)` 
                    : undefined
                }}
                disabled={loading}
              >
                <IconComponent className="w-5 h-5 mr-2" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleAddToCart(item)}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden border border-gray-100"
              disabled={loading}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <Coffee className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col space-y-2">
                  {item.is_featured && (
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </span>
                  )}
                  {item.is_alcoholic && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      21+
                    </span>
                  )}
                </div>

                {/* Dietary Icons */}
                <div className="absolute top-3 right-3 flex space-x-1">
                  {item.is_vegan && (
                    <div className="bg-green-500 p-1 rounded-full">
                      <Leaf className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {item.spice_level > 0 && (
                    <div className="bg-red-500 p-1 rounded-full">
                      <Flame className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-1">
                    {item.name || 'Unknown Item'}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Price and Details */}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(item.price || 0)}
                  </div>
                  {item.preparation_time > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      ~{item.preparation_time} min
                    </span>
                  )}
                </div>

                {/* Additional Info */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex space-x-2">
                    {item.is_vegetarian && <span className="text-green-600">Vegetarian</span>}
                    {item.is_gluten_free && <span className="text-blue-600">Gluten Free</span>}
                  </div>
                  {item.calories && (
                    <span>{item.calories} cal</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <Coffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500 mb-2">No items found</p>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}