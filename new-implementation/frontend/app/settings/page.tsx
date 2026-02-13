'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="text-gray-900">{user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company ID</label>
            <p className="text-gray-900">{user?.company_id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Roles</label>
            <div className="flex gap-2 mt-1">
              {user?.roles.map((role) => (
                <span key={role} className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded">
                  {role}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password & Security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Password management features coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}