import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-achat-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './achat-ticket.html',
  styleUrl: './achat-ticket.css'
})
export class AchatTicketComponent implements OnInit {

  lignes: any[] = [];
  ligneSelectionnee = '';
  modePaiement = 'WAVE';
  telephone = '';
  ticket: any = null;
  erreur = '';
  chargement = false;

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
    this.http.get<any[]>(
      '/api/v1/transport/lignes',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        console.log('Lignes reçues:', data);
        this.lignes = data;
      },
      error: (err) => {
        console.error('Erreur lignes:', err);
        this.erreur = 'Impossible de charger les lignes';
      }
    });
  }

  // Ligne actuellement sélectionnée — sert au récapitulatif du montant
  get ligneChoisie(): any | null {
    return this.lignes.find(l => l.id === this.ligneSelectionnee) ?? null;
  }

  acheterTicket(): void {
    if (!this.ligneSelectionnee) {
      this.erreur = 'Veuillez choisir une ligne';
      return;
    }

    // Le numéro n'est requis que pour les paiements mobiles
    if (this.modePaiement !== 'CASH' && !this.telephone.trim()) {
      this.erreur = 'Le numéro de téléphone est requis pour un paiement mobile';
      return;
    }

    this.chargement = true;
    this.erreur = '';

    // L'identité du citoyen n'est plus transmise par le client : le serveur
    // la déduit du jeton d'authentification.
    const url = `/api/v1/transport/tickets/acheter` +
      `?ligneId=${this.ligneSelectionnee}` +
      `&modePaiement=${this.modePaiement}` +
      `&telephone=${encodeURIComponent(this.telephone)}`;

    this.http.post<any>(url, {}, { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.chargement = false;
          this.ticket = data.ticket;

          // Redirige vers PayTech si lien disponible
          if (data.paymentUrl && data.paymentUrl !== '') {
            window.location.href = data.paymentUrl;
          }
        },
        error: (err) => {
          console.error('Erreur:', err);
          this.erreur = err.status === 401
            ? 'Votre session a expiré, reconnectez-vous.'
            : 'Erreur lors du paiement';
          this.chargement = false;
        }
      });
  }

  // Un ticket payé par mobile n'est valable qu'une fois le paiement confirmé
  // par l'opérateur : l'interface doit le dire clairement.
  get enAttentePaiement(): boolean {
    return this.ticket?.statut === 'EN_ATTENTE_PAIEMENT';
  }
}