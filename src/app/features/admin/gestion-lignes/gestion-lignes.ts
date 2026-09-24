import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-gestion-lignes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-lignes.html',
  styleUrl: './gestion-lignes.css'
})
export class GestionLignesComponent implements OnInit {

  lignes: any[] = [];
  chargement = true;
  afficherFormulaire = false;
  messageSucces = '';
  erreur = '';

  ligneEnEditionId: string | null = null;

  nouvelleLigne = {
    numero: '',
    nom: '',
    depart: '',
    arrivee: '',
    tarif: 0,
    dureeMinutes: 0,
    statut: 'ACTIVE'
  };

  statuts = ['ACTIVE', 'SUSPENDUE', 'EN_TRAVAUX'];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerLignes();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  chargerLignes(): void {
    this.chargement = true;
    this.http.get<any[]>(
      '/api/v1/transport/lignes',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.lignes = data;
        this.chargement = false;
      },
      error: () => this.chargement = false
    });
  }

  ouvrirAjout(): void {
    this.ligneEnEditionId = null;
    this.resetFormulaire();
    this.afficherFormulaire = true;
  }

  ouvrirModification(l: any): void {
    this.ligneEnEditionId = l.id;
    this.nouvelleLigne = {
      numero: l.numero,
      nom: l.nom,
      depart: l.depart,
      arrivee: l.arrivee,
      tarif: l.tarif,
      dureeMinutes: l.dureeMinutes,
      statut: l.statut
    };
    this.erreur = '';
    this.afficherFormulaire = true;
  }

  enregistrerLigne(): void {
    if (!this.nouvelleLigne.numero || !this.nouvelleLigne.depart || !this.nouvelleLigne.arrivee) {
      this.erreur = 'Numéro, départ et arrivée sont obligatoires';
      return;
    }

    if (this.ligneEnEditionId) {
      this.modifierLigneExistante();
    } else {
      this.ajouterLigne();
    }
  }

  private ajouterLigne(): void {
    this.http.post<any>(
      '/api/v1/transport/lignes',
      this.nouvelleLigne,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.lignes.push(data);
        this.messageSucces = 'Ligne ajoutée avec succès !';
        this.fermerFormulaire();
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => {
        this.erreur = 'Erreur lors de l\'ajout de la ligne';
      }
    });
  }

  private modifierLigneExistante(): void {
    const id = this.ligneEnEditionId;
    this.http.put<any>(
      `/api/v1/transport/lignes/${id}`,
      this.nouvelleLigne,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        const index = this.lignes.findIndex(l => l.id === id);
        if (index !== -1) this.lignes[index] = data;
        this.messageSucces = 'Ligne modifiée avec succès !';
        this.fermerFormulaire();
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => {
        this.erreur = 'Erreur lors de la modification de la ligne';
      }
    });
  }

  supprimerLigne(l: any): void {
    const confirme = window.confirm(
      `Supprimer définitivement la ligne ${l.numero} (${l.depart} → ${l.arrivee}) ? Cette action est irréversible.`
    );
    if (!confirme) return;

    this.http.delete(
      `/api/v1/transport/lignes/${l.id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.lignes = this.lignes.filter(x => x.id !== l.id);
        this.messageSucces = 'Ligne supprimée.';
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => {
        this.erreur = 'Erreur lors de la suppression de la ligne';
      }
    });
  }

  fermerFormulaire(): void {
    this.afficherFormulaire = false;
    this.ligneEnEditionId = null;
    this.resetFormulaire();
  }

  resetFormulaire(): void {
    this.nouvelleLigne = {
      numero: '',
      nom: '',
      depart: '',
      arrivee: '',
      tarif: 0,
      dureeMinutes: 0,
      statut: 'ACTIVE'
    };
    this.erreur = '';
  }

  getBadgeClass(statut: string): string {
    switch(statut) {
      case 'ACTIVE':     return 'badge-vert';
      case 'SUSPENDUE':  return 'badge-rouge';
      case 'EN_TRAVAUX': return 'badge-orange';
      default:           return 'badge-gris';
    }
  }
}