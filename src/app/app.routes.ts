import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register')
        .then(m => m.RegisterComponent)
  },
  {
    path: 'citoyen',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/citoyen/carte/carte')
        .then(m => m.CarteComponent)
  },
  {
    path: 'citoyen/ticket',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/citoyen/achat-ticket/achat-ticket')
        .then(m => m.AchatTicketComponent)
  },
  {
    path: 'citoyen/assistant',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/citoyen/dama-dem/dama-dem')
        .then(m => m.DamaDemComponent)
  },
  {
    path: 'citoyen/signaler-incident',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/citoyen/signaler-incident/signaler-incident')
        .then(m => m.SignalerIncidentComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/dashboard/dashboard')
        .then(m => m.DashboardComponent)
  },
  {
    path: 'admin/bus',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/gestion-bus/gestion-bus')
        .then(m => m.GestionBusComponent)
  },
  {
    path: 'admin/lignes',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/gestion-lignes/gestion-lignes')
        .then(m => m.GestionLignesComponent)
  },
  {
    path: 'admin/chauffeurs',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/gestion-chauffeurs/gestion-chauffeurs')
        .then(m => m.GestionChauffeursComponent)
  },
  {
    path: 'admin/incidents',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/gestion-incidents/gestion-incidents')
        .then(m => m.GestionIncidentsComponent)
  },
  { path: '**', redirectTo: 'login' }
];