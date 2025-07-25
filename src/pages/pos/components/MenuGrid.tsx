import React, { useState } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { Search, Wine, Coffee, Utensils, Beer } from 'lucide-react';

const categoryIcons = {
  'Utensils': Utensils,
  'ChefHat': Utensils,
  'Cake': Coffee,
  'Beer': Beer,
  'Wine': Wine,
  'Martini': Wine,
  'Coffee': Coffee
};

export function MenuGrid() {
  const { menuItems, categories, addToCart } = usePOSStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (item) => {
    addToCart(item);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filters */}
      <div className="p-6 bg-white border-b">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              !selectedCategory
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          {categories.map(category => {
            const IconComponent = categoryIcons[category.icon] || Utensils;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-4 py-2 rounded-xl font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: selectedCategory === category.id ? category.color : undefined
                }}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleAddToCart(item)}
              className="group p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-blue-600">
                    ${item.price.toFixed(2)}
                  </p>
                  {item.is_alcoholic && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      21+
                    </span>
                  )}
                </div>
                {item.preparation_time > 0 && (
                  <p className="text-xs text-gray-400">
                    ~{item.preparation_time} min
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No menu items found</p>
          </div>
        )}
      </div>
    </div>
  );
}