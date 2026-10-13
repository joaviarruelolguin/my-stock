import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { canActivate, redirectUnauthorizedTo } from '@angular/fire/auth-guard';
import { CollectionsComponent } from './components/collections/collections.component';
import { CartComponent } from './components/cart/cart.component';
import { LowStockComponent } from './components/low-stock/low-stock.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProveedoresComponent } from './components/proveedores/proveedores.component';
import { SalesListComponent } from './components/sales-list/sales-list.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { SettingsComponent } from './components/settings/settings.component';
import { AdminGuard } from './guards/admin.guard';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { GastosComponent } from './components/gastos/gastos.component';
import { FinanceComponent } from './components/finance/finance.component';
import { AppointmentListComponent } from './components/appointment-list/appointment-list.component';
import { WelcomeComponent } from './components/welcome/welcome.component';

const routes: Routes = [
  { path: 'welcome', component: WelcomeComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'users',
    component: UserManagementComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },
  {
    path: 'home',
    component: HomeComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },

  {
    path: 'products',
    component: ProductListComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },
  {
    path: 'collections',
    component: CollectionsComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },
  {
    path: 'cart',
    component: CartComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },
  {
    path: 'low-stock',
    component: LowStockComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },
  {
    path: 'providers',
    component: ProveedoresComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },

  {
    path: 'sales',
    component: SalesListComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },
  {
    path: 'gastos',
    component: GastosComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
    canActivate: [AdminGuard],
  },
  {
    path: 'finance',
    component: FinanceComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
    canActivate: [AdminGuard],
  },
  {
    path: 'sidebar',
    component: SideBarComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
  },
  {
    path: 'settings',
    component: SettingsComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
    canActivate: [AdminGuard],
  },
  {
    path: 'appointments',
    component: AppointmentListComponent,
    ...canActivate(() => redirectUnauthorizedTo(['/login'])),
    canActivate: [AdminGuard],
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
  },
  { path: '**', redirectTo: 'welcome', pathMatch: 'full' },
  // { path: '**', redirectTo: 'login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
