import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-signaler-incident',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signaler-incident.html',
  styleUrl: './signaler-incident.css'
})
export class SignalerIncidentComponent implements OnInit {

  nouvelIncident = {
    type: 'PANNE_MECANIQUE',
    description: '',
    statut: 'SIGNALE'
  };

  types = ['PANNE_MECANIQUE','ACCIDENT','EMBOUTEILLAGE',
           'RETARD','SURCHARGE','SECURITE'];

  messageSucces = '';
  erreur = '';
  chargement = false;

  // Mes signalements
  mesIncidents: any[] = [];
  chargementListe = true;
  incidentEnEditionId: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerMesIncidents();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
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

  chargerMesIncidents(): void {
    this.chargementListe = true;
    this.http.get<any[]>(
      '/api/v1/transport/incidents',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        const monUsername = this.authService.getUsername();
        this.mesIncidents = data.filter(i => i.signalePar === monUsername);
        this.chargementListe = false;
      },
      error: () => this.chargementListe = false
    });
  }

  signaler(): void {
    this.erreur = '';
    this.messageSucces = '';

    if (!this.nouvelIncident.description.trim()) {
      this.erreur = 'Merci de décrire l\'incident';
      return;
    }

    if (this.incidentEnEditionId) {
      this.modifierIncidentExistant();
    } else {
      this.creerIncident();
    }
  }

  private creerIncident(): void {
    this.chargement = true;

    this.http.post<any>(
      '/api/v1/transport/incidents',
      this.nouvelIncident,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.mesIncidents.unshift(data);
        this.messageSucces = 'Merci ! Votre signalement a bien été transmis.';
        this.chargement = false;
        this.resetFormulaire();
        setTimeout(() => this.messageSucces = '', 4000);
      },
      error: () => {
        this.erreur = 'Erreur lors de l\'envoi. Réessayez.';
        this.chargement = false;
      }
    });
  }

  private modifierIncidentExistant(): void {
    this.chargement = true;
    const id = this.incidentEnEditionId;

    this.http.put<any>(
      `/api/v1/transport/incidents/${id}`,
      this.nouvelIncident,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        const index = this.mesIncidents.findIndex(i => i.id === id);
        if (index !== -1) this.mesIncidents[index] = data;
        this.messageSucces = 'Votre signalement a été modifié.';
        this.chargement = false;
        this.resetFormulaire();
        setTimeout(() => this.messageSucces = '', 4000);
      },
      error: (err) => {
        this.erreur = err.error?.error || 'Erreur lors de la modification';
        this.chargement = false;
      }
    });
  }

  modifier(i: any): void {
    this.incidentEnEditionId = i.id;
    this.nouvelIncident = {
      type: i.type,
      description: i.description,
      statut: i.statut
    };
    this.erreur = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  annulerModification(): void {
    this.resetFormulaire();
  }

  supprimer(i: any): void {
    const confirme = window.confirm(
      'Supprimer définitivement ce signalement ? Cette action est irréversible.'
    );
    if (!confirme) return;

    this.http.delete(
      `/api/v1/transport/incidents/${i.id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.mesIncidents = this.mesIncidents.filter(x => x.id !== i.id);
        this.messageSucces = 'Signalement supprimé.';
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: (err) => {
        this.erreur = err.error?.error || 'Erreur lors de la suppression';
      }
    });
  }

  private resetFormulaire(): void {
    this.incidentEnEditionId = null;
    this.nouvelIncident = {
      type: 'PANNE_MECANIQUE',
      description: '',
      statut: 'SIGNALE'
    };
  }
}