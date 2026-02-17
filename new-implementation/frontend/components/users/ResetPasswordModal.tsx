'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserResponse } from '@/types/users';
import { X, KeyRound } from 'lucide-react';

interface ResetPasswordModalProps {
  user: UserResponse;
  onSubmit: (newPassword: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ResetPasswordModal({ user, onSubmit, onCancel, isLoading }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Mínimo 8 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setError('');
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Resetear Contraseña
            </CardTitle>
            <CardDescription>{user.name} · {user.email}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="newPwd">Nueva Contraseña *</Label>
              <Input
                id="newPwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPwd">Confirmar Contraseña *</Label>
              <Input
                id="confirmPwd"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetir contraseña"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Resetear contraseña'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
