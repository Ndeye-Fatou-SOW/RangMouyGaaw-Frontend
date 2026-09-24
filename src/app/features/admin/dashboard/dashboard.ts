import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  busActifs: any[] = [];
  lignes: any[] = [];
  totalBus = 0;
  totalLignes = 0;
  totalIncidents = 0;
  incidentsOuverts = 0;
  chargement = true;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerDonnees();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  chargerDonnees(): void {
    const headers = this.getHeaders();

    this.http.get<any[]>('/api/v1/transport/bus', { headers })
      .subscribe({
        next: (data) => {
          this.busActifs = data;
          this.totalBus = data.length;
          this.chargement = false;
        },
        error: () => this.chargement = false
      });

    this.http.get<any[]>('/api/v1/transport/lignes', { headers })
      .subscribe({
        next: (data) => {
          this.lignes = data;
          this.totalLignes = data.length;
        }
      });

    // Les statistiques d'incidents alimentent les tuiles qui affichaient
    // jusqu'ici une valeur figée à 0.
    this.http.get<any>('/api/v1/transport/incidents/statistiques', { headers })
      .subscribe({
        next: (stats) => {
          this.totalIncidents = stats.total ?? 0;
          const parStatut = stats.parStatut ?? {};
          this.incidentsOuverts =
            (parStatut['SIGNALE'] ?? 0) + (parStatut['EN_COURS'] ?? 0);
        }
      });
  }

  // Nombre de bus effectivement sur le terrain
  get busEnService(): number {
    return this.busActifs.filter(b => b.statut === 'EN_SERVICE').length;
  }

  classeStatutBus(statut: string): string {
    switch (statut) {
      case 'EN_SERVICE':     return 'badge-vert';
      case 'EN_DEPOT':       return 'badge-gris';
      case 'EN_MAINTENANCE': return 'badge-orange';
      case 'EN_PANNE':       return 'badge-rouge';
      default:               return 'badge-gris';
    }
  }
}
