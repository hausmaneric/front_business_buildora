import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouteReuseStrategy, DetachedRouteHandle } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class RouteReuse implements RouteReuseStrategy {
  private routeCache = new Map<string, DetachedRouteHandle>();
  private routesToCache: string[] = ['rota']; // Defina as rotas que deseja cachear

  shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    // Reutiliza a rota se o path for o mesmo
    return future.routeConfig === current.routeConfig;
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    // Armazena o handle do componente para reutilização se a rota estiver na lista de cache
    if (this.routesToCache.includes(route.routeConfig!.path!)) {
      this.routeCache.set(route.routeConfig!.path!, handle);
    }
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    // Retorna o handle do componente armazenado se a rota estiver na lista de cache
    if (this.routesToCache.includes(route.routeConfig!.path!)) {
      return this.routeCache.get(route.routeConfig!.path!) || null;
    }
    return null;
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Decide se deve desanexar (armazenar) a rota se ela estiver na lista de cache
    return this.routesToCache.includes(route.routeConfig!.path!);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    // Decide se deve reanexar a rota se ela estiver na lista de cache
    return !!route.routeConfig && this.routeCache.has(route.routeConfig.path!);
  }

  invalidate(route: string): void {
    // Remove a rota do cache
    this.routeCache.delete(route);
  }

  // Limpa todo o cache de rotas
  clearCache(): void {
    this.routeCache.clear();
  }
}
