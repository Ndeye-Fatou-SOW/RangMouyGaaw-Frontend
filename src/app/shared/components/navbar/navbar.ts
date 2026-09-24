import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme';

interface LienNav {
  chemin: string;
  icone: string;
  libelle: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {

  // Menu déroulant sur mobile (la barre latérale devient un tiroir)
  menuOuvert = false;

  readonly liensCitoyen: LienNav[] = [
    { chemin: '/citoyen',                    icone: '🗺', libelle: 'Carte GPS' },
    { chemin: '/citoyen/ticket',             icone: '🎫', libelle: 'Ticket' },
    { chemin: '/citoyen/assistant',          icone: '🤖', libelle: 'Dama dem' },
    { chemin: '/citoyen/signaler-incident',  icone: '🚨', libelle: 'Signaler' }
  ];

  readonly liensAdmin: LienNav[] = [
    { chemin: '/admin',            icone: '📊', libelle: 'Tableau de bord' },
    { chemin: '/admin/bus',        icone: '🚌', libelle: 'Bus' },
    { chemin: '/admin/lignes',     icone: '🛣', libelle: 'Lignes' },
    { chemin: '/admin/chauffeurs', icone: '🧑‍✈️', libelle: 'Chauffeurs' },
    { chemin: '/admin/incidents',  icone: '⚠',  libelle: 'Incidents' }
  ];

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router
  ) {}

  // Initiales affichées dans la pastille de profil
  get initiales(): string {
    const nom = this.authService.getUsername();
    return nom ? nom.substring(0, 2).toUpperCase() : '??';
  }

  get themeClair(): boolean {
    return this.themeService.theme() === 'clair';
  }

  basculerTheme(): void {
    this.themeService.basculer();
  }

  basculerMenu(): void {
    this.menuOuvert = !this.menuOuvert;
  }

  fermerMenu(): void {
    this.menuOuvert = false;
  }

  seDeconnecter(): void {
    this.fermerMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Deconnexion + suppression des historiques Dama dem de ce navigateur.
  // A utiliser sur un poste partage (cyber-cafe, salle machine).
  seDeconnecterEtEffacer(): void {
    this.fermerMenu();
    this.authService.logout(true);
    this.router.navigate(['/login']);
  }
}
