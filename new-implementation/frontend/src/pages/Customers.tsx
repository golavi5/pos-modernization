import { useState } from 'react'

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  totalSpent: number
  joinDate: string
}

export const Customers = () => {
  const [customers] = useState<Customer[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '(555) 123-4567', address: '123 Main St, City, Country', totalSpent: 2450.50, joinDate: '2025-01-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '(555) 987-6543', address: '456 Oak Ave, City, Country', totalSpent: 1890.75, joinDate: '2025-02-20' },
    { id: 3, name: 'Robert Johnson', email: 'robert@example.com', phone: '(555) 456-7890', address: '789 Pine Rd, City, Country', totalSpent: 3245.20, joinDate: '2025-03-10' },
    { id: 4, name: 'Emily Davis', email: 'emily@example.com', phone: '(555) 234-5678', address: '321 Elm Blvd, City, Country', totalSpent: 1560.00, joinDate: '2025-04-05' },
    { id: 5, name: 'Michael Wilson', email: 'michael@example.com', phone: '(555) 876-5432', address: '654 Cedar Ln, City, Country', totalSpent: 4120.30, joinDate: '2025-05-12' },
  ])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Add Customer
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-6 py-4 whitespace-nowrap">{customer.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{customer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-blue-600">{customer.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap">${customer.totalSpent.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.joinDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a href="#" className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</a>
                  <a href="#" className="text-red-600 hover:text-red-900">Delete</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}