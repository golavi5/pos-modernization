export const Sales = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Sales</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-4">New Sale</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Select customer</option>
                <option>John Doe</option>
                <option>Jane Smith</option>
                <option>Robert Johnson</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Cash</option>
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>Mobile Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
              <input 
                type="number" 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-4">Add Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Select product</option>
                <option>Laptop - $999.99</option>
                <option>Mouse - $24.99</option>
                <option>Keyboard - $49.99</option>
                <option>Monitor - $299.99</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input 
                type="number" 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="1"
              />
            </div>
          </div>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Add to Cart
          </button>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-4">Cart</h2>
          <div className="border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Laptop</td>
                  <td className="px-6 py-4 whitespace-nowrap">1</td>
                  <td className="px-6 py-4 whitespace-nowrap">$999.99</td>
                  <td className="px-6 py-4 whitespace-nowrap">$999.99</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-red-600 hover:text-red-900">Remove</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Mouse</td>
                  <td className="px-6 py-4 whitespace-nowrap">2</td>
                  <td className="px-6 py-4 whitespace-nowrap">$24.99</td>
                  <td className="px-6 py-4 whitespace-nowrap">$49.98</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-red-600 hover:text-red-900">Remove</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end">
          <div className="w-full md:w-1/3">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>$1,049.97</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Discount:</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Tax (19%):</span>
              <span>$199.50</span>
            </div>
            <div className="flex justify-between text-lg font-bold mt-4 pt-4 border-t">
              <span>Total:</span>
              <span>$1,249.47</span>
            </div>
            <button className="w-full mt-6 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 font-medium">
              Complete Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}