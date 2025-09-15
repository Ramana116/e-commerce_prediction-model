
import React, { useMemo } from 'react';
import type { Sale, Product } from '../types';

interface TopProductsProps {
    sales: Sale[];
    products: Product[];
}

export const TopProducts: React.FC<TopProductsProps> = ({ sales, products }) => {
    const topProducts = useMemo(() => {
        const productSales: { [key: string]: number } = {};
        sales.forEach(sale => {
            productSales[sale.productId] = (productSales[sale.productId] || 0) + sale.quantity;
        });

        return Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([productId, quantity]) => ({
                product: products.find(p => p.id === productId),
                quantity,
            }));
    }, [sales, products]);

    return (
        <div className="space-y-4">
            {topProducts.map(({ product, quantity }) =>
                product ? (
                    <div key={product.id} className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-text-primary">{product.name}</p>
                            <p className="text-sm text-text-secondary">{product.category}</p>
                        </div>
                        <p className="font-bold text-primary">{quantity.toLocaleString()} units</p>
                    </div>
                ) : null
            )}
        </div>
    );
};
