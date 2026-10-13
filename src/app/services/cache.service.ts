// filepath: /d:/Programación 2024/Programación 2025/MyStock 2.0/my-stock/src/app/services/cache.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private productsCache: any[] | null = null;

  getProductsCache(): any[] | null {
    return this.productsCache;
  }

  setProductsCache(products: any[]): void {
    this.productsCache = products;
  }
}
