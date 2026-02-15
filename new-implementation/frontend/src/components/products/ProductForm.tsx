'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { Product, CreateProductDto, UpdateProductDto } from '@/types/product';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: CreateProductDto | UpdateProductDto) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isLoading,
}: ProductFormProps) {
  const [formData, setFormData] = useState<CreateProductDto>({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: '',
    price: 0,
    cost: 0,
    stock_quantity: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    unit_of_measure: 'unidad',
    tax_rate: 19,
    image_url: '',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        barcode: product.barcode || '',
        category: product.category || '',
        price: product.price,
        cost: product.cost || 0,
        stock_quantity: product.stock_quantity,
        min_stock_level: product.min_stock_level || 0,
        max_stock_level: product.max_stock_level || 0,
        unit_of_measure: product.unit_of_measure || 'unidad',
        tax_rate: product.tax_rate || 19,
        image_url: product.image_url || '',
      });
    }
  }, [product]);

  const handleChange = (field: keyof CreateProductDto, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div className="md:col-span-2">
          <Label htmlFor="name">
            Nombre del producto <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ej: Laptop Dell Inspiron 15"
            required
          />
        </div>

        {/* Descripción */}
        <div className="md:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción del producto..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* SKU */}
        <div>
          <Label htmlFor="sku">
            SKU <span className="text-red-500">*</span>
          </Label>
          <Input
            id="sku"
            type="text"
            value={formData.sku}
            onChange={(e) => handleChange('sku', e.target.value)}
            placeholder="PRD-001"
            required
          />
        </div>

        {/* Código de barras */}
        <div>
          <Label htmlFor="barcode">Código de barras</Label>
          <Input
            id="barcode"
            type="text"
            value={formData.barcode}
            onChange={(e) => handleChange('barcode', e.target.value)}
            placeholder="1234567890123"
          />
        </div>

        {/* Categoría */}
        <div>
          <Label htmlFor="category">Categoría</Label>
          <Input
            id="category"
            type="text"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            placeholder="Electrónica"
          />
        </div>

        {/* Unidad de medida */}
        <div>
          <Label htmlFor="unit_of_measure">Unidad de medida</Label>
          <select
            id="unit_of_measure"
            value={formData.unit_of_measure}
            onChange={(e) => handleChange('unit_of_measure', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="unidad">Unidad</option>
            <option value="kg">Kilogramo</option>
            <option value="lb">Libra</option>
            <option value="lt">Litro</option>
            <option value="mt">Metro</option>
            <option value="caja">Caja</option>
            <option value="paquete">Paquete</option>
          </select>
        </div>

        {/* Precio */}
        <div>
          <Label htmlFor="price">
            Precio de venta <span className="text-red-500">*</span>
          </Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Costo */}
        <div>
          <Label htmlFor="cost">Costo</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>

        {/* Cantidad en stock */}
        <div>
          <Label htmlFor="stock_quantity">
            Cantidad en stock <span className="text-red-500">*</span>
          </Label>
          <Input
            id="stock_quantity"
            type="number"
            min="0"
            value={formData.stock_quantity}
            onChange={(e) =>
              handleChange('stock_quantity', parseInt(e.target.value) || 0)
            }
            placeholder="0"
            required
          />
        </div>

        {/* Stock mínimo */}
        <div>
          <Label htmlFor="min_stock_level">Stock mínimo</Label>
          <Input
            id="min_stock_level"
            type="number"
            min="0"
            value={formData.min_stock_level}
            onChange={(e) =>
              handleChange('min_stock_level', parseInt(e.target.value) || 0)
            }
            placeholder="0"
          />
        </div>

        {/* Stock máximo */}
        <div>
          <Label htmlFor="max_stock_level">Stock máximo</Label>
          <Input
            id="max_stock_level"
            type="number"
            min="0"
            value={formData.max_stock_level}
            onChange={(e) =>
              handleChange('max_stock_level', parseInt(e.target.value) || 0)
            }
            placeholder="0"
          />
        </div>

        {/* Tasa de impuesto */}
        <div>
          <Label htmlFor="tax_rate">Tasa de impuesto (%)</Label>
          <Input
            id="tax_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.tax_rate}
            onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
            placeholder="19"
          />
        </div>

        {/* URL de imagen */}
        <div className="md:col-span-2">
          <Label htmlFor="image_url">URL de imagen</Label>
          <Input
            id="image_url"
            type="url"
            value={formData.image_url}
            onChange={(e) => handleChange('image_url', e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          {formData.image_url && (
            <div className="mt-2">
              <img
                src={formData.image_url}
                alt="Preview"
                className="w-32 h-32 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : product ? 'Actualizar' : 'Crear producto'}
        </Button>
      </div>
    </form>
  );
}
