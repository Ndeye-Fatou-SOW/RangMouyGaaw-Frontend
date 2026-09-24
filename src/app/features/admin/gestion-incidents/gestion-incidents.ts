import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-gestion-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-incidents.html',
  styleUrl: './gestion-incidents.css'
})
export class GestionIncidentsComponent implements OnInit {

  incidents: any[] = [];
  chargement = true;
  afficherFormulaire = false;
  messageSucces = '';
  erreur = '';

  incidentEnEditionId: string | null = null;

  nouvelIncident = {
    type: 'PANNE_MECANIQUE',
    description: '',
    statut: 'SIGNALE'
  };

  types = ['PANNE_MECANIQUE','ACCIDENT','EMBOUTEILLAGE',
           'RETARD','SURCHARGE','SECURITE'];
  statuts = ['SIGNALE','EN_TRAITEMENT','RESOLU','FERME'];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void { this.chargerIncidents(); }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  chargerIncidents(): void {
    this.chargement = true;
    this.http.get<any[]>(
      '/api/v1/transport/incidents',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => { this.incidents = data; this.chargement = false; },
      error: () => this.chargement = false
    });
  }

  ouvrirAjout(): void {
    this.incidentEnEditionId = null;
    this.resetFormulaire();
    this.afficherFormulaire = true;
  }

  ouvrirModification(i: any): void {
    this.incidentEnEditionId = i.id;
    this.nouvelIncident = {
      type: i.type,
      description: i.description,
      statut: i.statut
    };
    this.erreur = '';
    this.afficherFormulaire = true;
  }

  enregistrerIncident(): void {
    if (!this.nouvelIncident.description) {
      this.erreur = 'Description obligatoire';
      return;
    }

    if (this.incidentEnEditionId) {
      this.modifierIncidentExistant();
    } else {
      this.signalerIncident();
    }
  }

  private signalerIncident(): void {
    this.http.post<any>(
      '/api/v1/transport/incidents',
      this.nouvelIncident,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.incidents.unshift(data);
        this.messageSucces = 'Incident signalé !';
        this.fermerFormulaire();
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => this.erreur = 'Erreur lors du signalement'
    });
  }

  private modifierIncidentExistant(): void {
    const id = this.incidentEnEditionId;
    this.http.put<any>(
      `/api/v1/transport/incidents/${id}`,
      this.nouvelIncident,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        const index = this.incidents.findIndex(i => i.id === id);
        if (index !== -1) this.incidents[index] = data;
        this.messageSucces = 'Incident modifié !';
        this.fermerFormulaire();
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => this.erreur = 'Erreur lors de la modification'
    });
  }

  supprimerIncident(i: any): void {
    const confirme = window.confirm(
      `Supprimer définitivement cet incident (${i.type}) ? Cette action est irréversible.`
    );
    if (!confirme) return;

    this.http.delete(
      `/api/v1/transport/incidents/${i.id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.incidents = this.incidents.filter(x => x.id !== i.id);
        this.messageSucces = 'Incident supprimé.';
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => this.erreur = 'Erreur lors de la suppression'
    });
  }

  changerStatut(id: string, statut: string): void {
    this.http.patch<any>(
      `/api/v1/transport/incidents/${id}/statut`,
      { statut },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        const i = this.incidents.find(i => i.id === id);
        if (i) i.statut = statut;
        this.messageSucces = 'Statut mis à jour !';
        setTimeout(() => this.messageSucces = '', 3000);
      }
    });
  }

  fermerFormulaire(): void {
    this.afficherFormulaire = false;
    this.incidentEnEditionId = null;
    this.resetFormulaire();
  }

  resetFormulaire(): void {
    this.nouvelIncident = {
      type: 'PANNE_MECANIQUE', description: '', statut: 'SIGNALE'
    };
    this.erreur = '';
  }

  getIconeType(type: string): string {
    const icones: any = {
      'PANNE_MECANIQUE': '🔧',
      'ACCIDENT':        '💥',
      'EMBOUTEILLAGE':   '🚗',
      'RETARD':          '⏰',
      'SURCHARGE':       '👥',
      'SECURITE':        '🚨'
    };
    return icones[type] || '⚠';
  }

  getBadgeClass(statut: string): string {
    switch(statut) {
      case 'SIGNALE':        return 'badge-rouge';
      case 'EN_TRAITEMENT':  return 'badge-orange';
      case 'RESOLU':         return 'badge-vert';
      case 'FERME':          return 'badge-gris';
      default:               return 'badge-gris';
    }
  }
}