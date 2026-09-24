import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {

  get themeClair(): boolean {
    return this.themeService.theme() === 'clair';
  }

  basculerTheme(): void {
    this.themeService.basculer();
  }

  username = '';
  password = '';
  confirmationPassword = '';
  erreur = '';
  chargement = false;

  /** Doit rester aligné sur la règle appliquée par le serveur. */
  readonly longueurMiniMotDePasse = 8;

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private router: Router
  ) {}

  sInscrire(): void {
    this.erreur = '';

    if (!this.username || !this.password) {
      this.erreur = 'Veuillez remplir tous les champs';
      return;
    }

    if (this.password !== this.confirmationPassword) {
      this.erreur = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.password.length < this.longueurMiniMotDePasse) {
      this.erreur = `Le mot de passe doit contenir au moins `
        + `${this.longueurMiniMotDePasse} caractères`;
      return;
    }

    this.chargement = true;

    this.authService.register(this.username, this.password)
      .subscribe({
        next: () => {
          this.chargement = false;
          this.router.navigate(['/citoyen']);
        },
        error: (err) => {
          this.chargement = false;
          this.erreur = err.error?.error || 'Erreur lors de l\'inscription';
        }
      });
  }
}