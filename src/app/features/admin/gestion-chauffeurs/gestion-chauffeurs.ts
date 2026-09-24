import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-gestion-chauffeurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-chauffeurs.html',
  styleUrl: './gestion-chauffeurs.css'
})
export class GestionChauffeursComponent implements OnInit {

  chauffeurs: any[] = [];
  chargement = true;
  afficherFormulaire = false;
  messageSucces = '';
  erreur = '';

  chauffeurEnEditionId: string | null = null;

  nouveauChauffeur = {
    prenom: '',
    nom: '',
    telephone: '',
    numeroPermis: '',
    statut: 'EN_REPOS',
    scoreConduite: 4.0
  };

  statuts = ['EN_SERVICE', 'EN_REPOS', 'EN_CONGE', 'SUSPENDU'];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void { this.chargerChauffeurs(); }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  chargerChauffeurs(): void {
    this.chargement = true;
    this.http.get<any[]>(
      '/api/v1/transport/chauffeurs',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => { this.chauffeurs = data; this.chargement = false; },
      error: () => this.chargement = false
    });
  }

  ouvrirAjout(): void {
    this.chauffeurEnEditionId = null;
    this.resetFormulaire();
    this.afficherFormulaire = true;
  }

  ouvrirModification(c: any): void {
    this.chauffeurEnEditionId = c.id;
    this.nouveauChauffeur = {
      prenom: c.prenom,
      nom: c.nom,
      telephone: c.telephone,
      numeroPermis: c.numeroPermis,
      statut: c.statut,
      scoreConduite: c.scoreConduite
    };
    this.erreur = '';
    this.afficherFormulaire = true;
  }

  enregistrerChauffeur(): void {
    if (!this.nouveauChauffeur.prenom || !this.nouveauChauffeur.nom) {
      this.erreur = 'Prénom et nom sont obligatoires';
      return;
    }

    if (this.chauffeurEnEditionId) {
      this.modifierChauffeurExistant();
    } else {
      this.ajouterChauffeur();
    }
  }

  private ajouterChauffeur(): void {
    this.http.post<any>(
      '/api/v1/transport/chauffeurs',
      this.nouveauChauffeur,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.chauffeurs.push(data);
        this.messageSucces = 'Chauffeur ajouté !';
        this.fermerFormulaire();
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => this.erreur = 'Erreur lors de l\'ajout'
    });
  }

  private modifierChauffeurExistant(): void {
    const id = this.chauffeurEnEditionId;
    this.http.put<any>(
      `/api/v1/transport/chauffeurs/${id}`,
      this.nouveauChauffeur,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        const index = this.chauffeurs.findIndex(c => c.id === id);
        if (index !== -1) this.chauffeurs[index] = data;
        this.messageSucces = 'Chauffeur modifié !';
        this.fermerFormulaire();
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => this.erreur = 'Erreur lors de la modification'
    });
  }

  supprimerChauffeur(c: any): void {
    const confirme = window.confirm(
      `Supprimer définitivement ${c.prenom} ${c.nom} ? Cette action est irréversible.`
    );
    if (!confirme) return;

    this.http.delete(
      `/api/v1/transport/chauffeurs/${c.id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.chauffeurs = this.chauffeurs.filter(x => x.id !== c.id);
        this.messageSucces = 'Chauffeur supprimé.';
        setTimeout(() => this.messageSucces = '', 3000);
      },
      error: () => this.erreur = 'Erreur lors de la suppression'
    });
  }

  changerStatut(id: string, statut: string): void {
    this.http.patch<any>(
      `/api/v1/transport/chauffeurs/${id}/statut`,
      { statut },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        const c = this.chauffeurs.find(c => c.id === id);
        if (c) c.statut = statut;
        this.messageSucces = 'Statut mis à jour !';
        setTimeout(() => this.messageSucces = '', 3000);
      }
    });
  }

  fermerFormulaire(): void {
    this.afficherFormulaire = false;
    this.chauffeurEnEditionId = null;
    this.resetFormulaire();
  }

  resetFormulaire(): void {
    this.nouveauChauffeur = {
      prenom: '', nom: '', telephone: '',
      numeroPermis: '', statut: 'EN_REPOS', scoreConduite: 4.0
    };
    this.erreur = '';
  }

  getBadgeClass(statut: string): string {
    switch(statut) {
      case 'EN_SERVICE': return 'badge-vert';
      case 'EN_REPOS':   return 'badge-gris';
      case 'EN_CONGE':   return 'badge-orange';
      case 'SUSPENDU':   return 'badge-rouge';
      default:           return 'badge-gris';
    }
  }
}