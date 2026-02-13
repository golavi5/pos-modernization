export const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Sales</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">$12,345</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Orders</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">1,234</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Customers</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">567</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Products</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">89</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Sales</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">#ORD-001</td>
                <td className="px-6 py-4 whitespace-nowrap">John Doe</td>
                <td className="px-6 py-4 whitespace-nowrap">Feb 10, 2026</td>
                <td className="px-6 py-4 whitespace-nowrap">$245.00</td>
                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span></td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">#ORD-002</td>
                <td className="px-6 py-4 whitespace-nowrap">Jane Smith</td>
                <td className="px-6 py-4 whitespace-nowrap">Feb 10, 2026</td>
                <td className="px-6 py-4 whitespace-nowrap">$120.50</td>
                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span></td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">#ORD-003</td>
                <td className="px-6 py-4 whitespace-nowrap">Robert Johnson</td>
                <td className="px-6 py-4 whitespace-nowrap">Feb 9, 2026</td>
                <td className="px-6 py-4 whitespace-nowrap">$89.99</td>
                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}