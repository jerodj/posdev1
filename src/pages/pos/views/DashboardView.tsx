import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { posApi } from '../../../lib/api';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Star,
  Coffee
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  activeOrders: number;
  availableTables: number;
  totalTips: number;
  averageOrderValue: number;
}

// UGX currency formatter
const formatUGX = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export function DashboardView() {
  const { currentUser, currentShift, orders, tables } = usePOSStore();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    activeOrders: 0,
    availableTables: 0,
    totalTips: 0,
    averageOrderValue: 0
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Memoized fetch function with UGX formatting
  const fetchDashboardStats = useCallback(async () => {
    if (loading || (lastUpdated && Date.now() - lastUpdated.getTime() < 30000)) {
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching dashboard stats...');
      const statsData = await posApi.getDashboardStats();
      
      setStats({
        todaySales: statsData.todaySales || 0,
        todayOrders: statsData.todayOrders || 0,
        activeOrders: orders.length,
        availableTables: tables.filter(t => t.status === 'available').length,
        totalTips: statsData.totalTips || 0,
        averageOrderValue: statsData.averageOrderValue || 0
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error(`Failed to load dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [orders.length, tables, lastUpdated, loading]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchDashboardStats();
    const intervalId = setInterval(fetchDashboardStats, 60000);
    return () => clearInterval(intervalId);
  }, [fetchDashboardStats]);

  // Memoized derived data
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const urgentOrders = useMemo(() => 
    orders.filter(order => 
      order.priority === 'urgent' || 
      (new Date() - new Date(order.created_at)) > 30 * 60 * 1000
    ),
    [orders]
  );

  // Memoized StatCard component with UGX formatting
  const StatCard = useMemo(() => 
    ({ title, value, icon: Icon, color }: {
      title: string;
      value: string | number;
      icon: React.ElementType;
      color: string;
    }) => (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-r ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' && title.includes('UGX') ? formatUGX(value) : value}
          </p>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </div>
    ),
    []
  );

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-full">
      {/* Welcome Header with UGX currency indicator */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {currentUser?.full_name || 'User'}! 👋
            </h1>
            <p className="text-purple-100">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} • All amounts in UGX
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{format(new Date(), 'HH:mm')}</div>
            <div className="text-purple-200 capitalize">{currentUser?.role || 'unknown'}</div>
            {lastUpdated && (
              <div className="text-xs text-purple-200 mt-1">
                Updated: {format(lastUpdated, 'HH:mm:ss')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid with UGX values */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="Today's Sales (UGX)"
          value={stats.todaySales}
          icon={DollarSign}
          color="from-green-500 to-emerald-600"
        />
        <StatCard
          title="Orders Today"
          value={stats.todayOrders}
          icon={ShoppingCart}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active Orders"
          value={stats.activeOrders}
          icon={Clock}
          color="from-orange-500 to-orange-600"
        />
        <StatCard
          title="Available Tables"
          value={stats.availableTables}
          icon={Users}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          title="Tips Today (UGX)"
          value={stats.totalTips}
          icon={Star}
          color="from-yellow-500 to-yellow-600"
        />
        <StatCard
          title="Avg Order (UGX)"
          value={stats.averageOrderValue}
          icon={TrendingUp}
          color="from-indigo-500 to-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders with UGX amounts */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Amounts in UGX</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {recentOrders.length > 0 ? (
              recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      order.status === 'paid' ? 'bg-green-500' :
                      order.status === 'ready' ? 'bg-blue-500' :
                      order.status === 'preparing' ? 'bg-orange-500' :
                      'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className="font-semibold text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-500">
                        {order.table ? `Table ${order.table.number}` : order.order_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatUGX(order.total_amount)}</p>
                    <p className="text-xs text-gray-500">{format(new Date(order.created_at), 'HH:mm')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Coffee className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Alerts & Status</h2>
            <div className="flex items-center space-x-2">
              {urgentOrders.length > 0 && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Shift Status */}
            <div className={`p-4 rounded-xl border-l-4 ${
              currentShift 
                ? 'bg-green-50 border-green-500' 
                : 'bg-yellow-50 border-yellow-500'
            }`}>
              <div className="flex items-center space-x-3">
                {currentShift ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {currentShift ? 'Shift Active' : 'No Active Shift'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentShift 
                      ? `Started at ${format(new Date(currentShift.start_time), 'HH:mm')}`
                      : 'Start your shift to begin taking orders'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Urgent Orders */}
            {urgentOrders.length > 0 && (
              <div className="p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Urgent Orders</p>
                    <p className="text-sm text-gray-600">
                      {urgentOrders.length} order(s) need immediate attention
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Table Status */}
            <div className="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Table Status</p>
                  <p className="text-sm text-gray-600">
                    {stats.availableTables} of {tables.length} tables available
                  </p>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">System Online</p>
                  <p className="text-sm text-gray-600">All systems operational</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}