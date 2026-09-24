import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-gestion-bus',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-bus.html',
  styleUrl: './gestion-bus.css'
})
export class GestionBusComponent implements OnInit {

  bus: any[] = [];
  chargement = true;
  afficherFormulaire = false;
  messageSucces = '';
  erreur = '';

  busEnEditionId: string | null = null;

  nouveauBus = {
    immatriculation: '',
    modele: '',
    capacite: 0,
    statut: 'EN_DEPOT',
    scoreFilabilite: 4.0,
    kilometrage: 0
  };

  statuts = ['EN_SERVICE', 'EN_DEPOT', 'EN_MAINTENANCE', 'EN_PANNE'];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerBus();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  chargerBus(): void {
    this.chargement = true;
    this.http.get<any[]>(
      '/api/v1/transport/bus/tous',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.bus = data;
        this.chargement = false;
      },
      error: () => {
        this.http.get<any[]>(
          '/api/v1/transport/bus',
          { headers: this.getHeaders() }
        ).subscribe({
          next: (data) => {
            this.bus = data;
            this.chargement = false;
          },
          error: () => this.chargement = false
        });
      }
    });
  }

  ouvrirAjout(): void {
    this.busEnEditionId = null;
    this.resetFormulaire();
    this.afficherFormulaire = true;
  }

  ouvrirModification(b: any): void {
    this.busEnEditionId = b.id;
    this.nouveauBus = {
      immatriculation: b.immatriculation,
      modele: b.modele,
      capacite: b.capacite,
      statut: b.statut,
      scoreFilabilite: b.scoreFilabilite,
      kilometrage: b.kilometrage
    };
    this.erreur = '';
    this.afficherFormulaire = true;
  }

  enregistrerBus(): void {
    if (!this.nouveauBus.immatriculation || !this.nouveauBus.modele) {
      this.erreur = 'Immatriculation et modèle sont obligatoires';
      return;
    }

    if (this.busEnEditionId) {
      this.modifierBusExistant();
    } else {
      this.ajouterBus();
    }
  }

  private ajouterBus(): void {
    this.http.post<any>(
      '/api/v1/transport/bus',
      this.nouveauBus,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.bus.push(data);
        this.messageSucces = 'Bus ajouté avec succès !';
        this.fermerFormulaire();
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => {
        this.erreur = 'Erreur lors de l\'ajout du bus';
      }
    });
  }

  private modifierBusExistant(): void {
    const id = this.busEnEditionId;
    this.http.put<any>(
      `/api/v1/transport/bus/${id}`,
      this.nouveauBus,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        const index = this.bus.findIndex(b => b.id === id);
        if (index !== -1) this.bus[index] = data;
        this.messageSucces = 'Bus modifié avec succès !';
        this.fermerFormulaire();
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => {
        this.erreur = 'Erreur lors de la modification du bus';
      }
    });
  }

  supprimerBus(b: any): void {
    const confirme = window.confirm(
      `Supprimer définitivement le bus ${b.immatriculation} ? Cette action est irréversible.`
    );
    if (!confirme) return;

    this.http.delete(
      `/api/v1/transport/bus/${b.id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.bus = this.bus.filter(x => x.id !== b.id);
        this.messageSucces = 'Bus supprimé.';
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => {
        this.erreur = 'Erreur lors de la suppression du bus';
      }
    });
  }

  changerStatut(busId: string, nouveauStatut: string): void {
    this.http.patch<any>(
      `/api/v1/transport/bus/${busId}/statut`,
      { statut: nouveauStatut },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        const bus = this.bus.find(b => b.id === busId);
        if (bus) bus.statut = nouveauStatut;
        this.messageSucces = 'Statut mis à jour !';
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => this.erreur = 'Erreur mise à jour statut'
    });
  }

  fermerFormulaire(): void {
    this.afficherFormulaire = false;
    this.busEnEditionId = null;
    this.resetFormulaire();
  }

  resetFormulaire(): void {
    this.nouveauBus = {
      immatriculation: '',
      modele: '',
      capacite: 0,
      statut: 'EN_DEPOT',
      scoreFilabilite: 4.0,
      kilometrage: 0
    };
    this.erreur = '';
  }

  getBadgeClass(statut: string): string {
    switch(statut) {
      case 'EN_SERVICE':     return 'badge-vert';
      case 'EN_DEPOT':       return 'badge-gris';
      case 'EN_MAINTENANCE': return 'badge-orange';
      case 'EN_PANNE':       return 'badge-rouge';
      default:               return 'badge-gris';
    }
  }
}